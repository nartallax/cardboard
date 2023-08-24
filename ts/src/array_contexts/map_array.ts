import {BoxInternal, RBox, WBox} from "src/internal"

export function mapArray<E, K, R>(upstream: BoxInternal<readonly E[]>, getKey: (item: E, index: number) => K, mapBox: (box: WBox<E>, index: number) => R): RBox<R[]> {
	void upstream, getKey, mapBox
	return null as any
	// let context = upstream.getArrayContext(getKey)
	// const keyToChildMap = new Map<K, R>()

	// watchAndRun(null, parent, childItems, (childItems, _, meta) => {
	// 	if(meta){
	// 		switch(meta.type){
	// 			case "array_item_update": {
	// 				// fully processed by array context, no action required
	// 				return
	// 			}

	// 			case "array_items_insert": {
	// 				const nextChild = parent.childNodes[meta.index]
	// 				for(let offset = 0; offset < meta.count; offset++){
	// 					const index = meta.index + offset
	// 					const key = getKey(childItems[index]!, index)
	// 					const child = renderChild(arrayContext.getBoxForKey(key))
	// 					keyToChildMap.set(key, child)
	// 					if(nextChild){
	// 						parent.insertBefore(child, nextChild)
	// 					} else {
	// 						parent.appendChild(child)
	// 					}
	// 				}
	// 				return
	// 			}

	// 			case "array_items_delete": {
	// 				for(const {index, value} of meta.indexValuePairs){
	// 					const key = getKey(value as T, index)
	// 					const child = keyToChildMap.get(key)
	// 					if(!child){
	// 						throw new Error("Tried to delete child at key " + key + ", but there's no item for that key.")
	// 					}
	// 					parent.removeChild(child)
	// 					keyToChildMap.delete(key)
	// 				}
	// 				return
	// 			}

	// 			case "array_items_delete_all": {
	// 				while(parent.firstChild){
	// 					parent.removeChild(parent.firstChild)
	// 				}
	// 				keyToChildMap.clear()
	// 				return
	// 			}

	// 		}
	// 	}

	// 	const newChildArray: Node[] = new Array(childItems.length)
	// 	const outdatedKeys = new Set(keyToChildMap.keys())
	// 	for(let i = 0; i < childItems.length; i++){
	// 		const childItem = childItems[i]!
	// 		const key = getKey(childItem, i)
	// 		let child = keyToChildMap.get(key)
	// 		if(!child){
	// 			const box = arrayContext.getBoxForKey(key)
	// 			child = renderChild(box)
	// 			keyToChildMap.set(key, child)
	// 		}
	// 		newChildArray[i] = child
	// 		outdatedKeys.delete(key)
	// 	}

	// 	for(const outdatedKey of outdatedKeys){
	// 		keyToChildMap.delete(outdatedKey)
	// 	}

	// 	updateChildren(parent, newChildArray)
	// })
}