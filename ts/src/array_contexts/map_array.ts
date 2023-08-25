import {BoxInternal, BoxUpdateMeta, RBox, WBox} from "src/internal"

export function mapArray<E, K, R>(upstream: BoxInternal<readonly E[]>, getKey: (item: E, index: number) => K, mapper: (box: WBox<E>, index: number) => R): RBox<readonly R[]> {
	const context = upstream.getArrayContext(getKey)
	const keyToResultMap = new Map<K, R>()

	// TODO: this whole function is kinda cringe. may it be better? I don't need second context, right?
	return upstream.mapWithMeta((srcElements, meta) => {
		const newMeta: BoxUpdateMeta | undefined = undefined
		switch(meta?.type){
			case "array_item_update": {
				const key = getKey(srcElements[meta.index] as E, meta.index)
				if(!keyToResultMap.has(key)){
					const oldKey = getKey(meta.oldValue as E, meta.index)
					keyToResultMap.delete(oldKey)
					const box = context.getBoxForKey(key)
					keyToResultMap.set(key, mapper(box, meta.index))
				}
				break
			}

			case "array_items_insert": {
				for(let offset = 0; offset < meta.count; offset++){
					const index = meta.index + offset
					const key = getKey(srcElements[index]!, index)
					const child = mapper(context.getBoxForKey(key), index)
					keyToResultMap.set(key, child)
				}
				break
			}

			case "array_items_delete": {
				for(const {index, value} of meta.indexValuePairs){
					const key = getKey(value as E, index)
					const child = keyToResultMap.get(key)
					if(!child){
						throw new Error("Tried to delete child at key " + key + ", but there's no item for that key.")
					}
					keyToResultMap.delete(key)
				}
				break
			}

			case "array_items_delete_all": {
				keyToResultMap.clear()
				return {result: [], meta: {type: "array_items_delete_all"}}
			}

			default: {
				// full update
				const outdatedKeys = new Set(keyToResultMap.keys())

				for(let i = 0; i < srcElements.length; i++){
					const childItem = srcElements[i]!
					const key = getKey(childItem, i)
					let child = keyToResultMap.get(key)
					if(!child){
						const box = context.getBoxForKey(key)
						child = mapper(box, i)
						keyToResultMap.set(key, child)
					}
					outdatedKeys.delete(key)
				}

				for(const outdatedKey of outdatedKeys){
					keyToResultMap.delete(outdatedKey)
				}
			}

		}

		const newChildArray: R[] = new Array(srcElements.length)
		for(let i = 0; i < srcElements.length; i++){
			newChildArray[i] = keyToResultMap.get(getKey(srcElements[i]!, i))!
		}
		return {result: newChildArray, meta: newMeta}
	})
}