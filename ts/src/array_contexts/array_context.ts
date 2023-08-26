import {isWBox, ArrayItemBox, UpstreamSubscriber, BoxInternal, ArrayItemRBoxImpl, ArrayItemWBoxImpl, ArrayContext, BoxUpdateMeta, ArrayContextControlledBox, RBox} from "src/internal"

interface BoxWithValue<E, K, V> {
	readonly box: ArrayItemBox<E, K>
	readonly value: V
}

/** This class controls a set of boxes that contain items of some array box
 * Links upstream array box with downstream item boxes
 *
 * In theory, we could live without this class,
 * but this means item boxes will need to perform a lot of checking every update
 * which is undesirable, because it's a performance hit */
export class ArrayContextImpl<E, K, V> implements UpstreamSubscriber, ArrayContext<E, K, ArrayItemBox<E, K>> {
	private readonly pairs = new Map<K, BoxWithValue<E, K, V>>()
	private childSubCount = 0
	private lastKnownUpstreamValue: readonly E[] | null = null
	private mappedValueBox: ArrayContextControlledBox<readonly V[]> | null = null

	constructor(readonly upstream: BoxInternal<readonly E[]>, private readonly getKey: (element: E, index: number) => K, private readonly getValue: (element: ArrayItemBox<E, K>, index: number) => V) {
	}

	tryUpdate(): void {
		if(this.childSubCount > 0){
			// the same logic as in calcbox - if we are being subscribed to, then we are subscribed to upstream
			// that means our value is up-to-date
			return
		}
		const upstreamArray = this.upstream.get()
		if(upstreamArray !== this.lastKnownUpstreamValue){
			this.onUpstreamChange(this.upstream, undefined, upstreamArray)
		}
	}

	private makeChildBox(item: E, index: number, key: K): BoxWithValue<E, K, V> {
		const box = !isWBox(this.upstream)
			? new ArrayItemRBoxImpl<E, K>(this, item, index, key)
			: new ArrayItemWBoxImpl<E, K>(this, item, index, key)
		const pair = {box, value: null as unknown as V}
		this.pairs.set(key, pair)
		pair.value = this.getValue(box, index)
		return pair
	}

	onUpstreamChange(_: BoxInternal<unknown>, meta: BoxUpdateMeta | undefined, upstreamArray?: readonly E[]): void {
		upstreamArray ??= this.upstream.get()
		this.lastKnownUpstreamValue = upstreamArray
		let newMeta: BoxUpdateMeta | undefined = undefined
		let shouldUpdateValues = true

		switch(meta?.type){

			case "array_item_update": {
				const item = upstreamArray[meta.index]!
				const key = this.getKey(item, meta.index)
				const pair = this.pairs.get(key)
				if(!pair){
					// TODO: test of key update?
					const oldKey = this.getKey(meta.oldValue as E, meta.index)
					const oldPair = this.pairs.get(oldKey)
					if(!oldPair){
						throw new Error("Array element is not found by key " + oldKey)
					}
					this.pairs.delete(oldKey)
					this.makeChildBox(item, meta.index, key)
					newMeta = {type: "array_item_update", index: meta.index, oldValue: oldPair.value}
				} else {
					pair.box.set(item, this)
					shouldUpdateValues = false
				}
				break
			}

			case "array_items_insert": {
				const newValuesArray: V[] = new Array(meta.count)
				for(let offset = 0; offset < meta.count; offset++){
					const index = meta.index + offset
					const item = upstreamArray[index]!
					const key = this.getKey(item, index)
					if(this.pairs.get(key)){
						throw new Error("Duplicate key: " + key)
					}
					const pair = this.makeChildBox(item, index, key)
					newValuesArray[offset] = pair.value
				}
				newMeta = {type: "array_items_insert", count: meta.count, index: meta.index}
				break
			}

			case "array_items_delete": {
				const newIndexValuePairs: {index: number, value: unknown}[] = new Array(meta.indexValuePairs.length)
				for(let i = 0; i < meta.indexValuePairs.length; i++){
					const {index, value} = meta.indexValuePairs[i]!
					const key = this.getKey(value as E, index)
					const pair = this.pairs.get(key)
					if(!pair){
						throw new Error("Tried to delete item at key " + key + ", but there's no item for that key.")
					}
					pair.box.dispose()
					this.pairs.delete(key)
					newIndexValuePairs[i] = {index, value: pair.value}
				}
				newMeta = {type: "array_items_delete", indexValuePairs: newIndexValuePairs}
				break
			}

			case "array_items_delete_all": {
				for(const pair of this.pairs.values()){
					pair.box.dispose()
				}
				this.pairs.clear()
				newMeta = {type: "array_items_delete_all"}
				break
			}

			default: {
				const outdatedKeys = new Set(this.pairs.keys())
				for(let index = 0; index < upstreamArray.length; index++){
					const item = upstreamArray[index]!
					const key = this.getKey(item, index)
					const pair = this.pairs.get(key)
					if(pair){
						if(!outdatedKeys.has(key)){
							throw new Error("Constraint violated, key is not unique: " + key)
						}
						pair.box.set(item, this)
						pair.box.index = index
					} else {
						this.makeChildBox(item, index, key)
					}

					outdatedKeys.delete(key)
				}

				for(const key of outdatedKeys){
					const pair = this.pairs.get(key)!
					pair.box.dispose()
					this.pairs.delete(key)
				}

				break
			}
		}

		if(this.mappedValueBox !== null && shouldUpdateValues){
			this.mappedValueBox.set(this.makeValuesArray(), this, newMeta)
		}
	}

	onDownstreamChange(downstreamBox: ArrayItemBox<E, K>, value: E): void {
		const newKey = this.getKey(value, downstreamBox.index)
		if(newKey !== downstreamBox.key){
			/* changing keys within one box is not allowed
			sure, we can handle it... within this context;
			but there could be more than one context for an array box,
			and that other context won't be updated, which will increase confusion.

			also changing a key like that is generally confusing idea, not sure why anyone would do that */
			throw new Error("Array item box changed key, which is not allowed; was: " + downstreamBox.key + ", now " + newKey)
		}

		const oldUpstreamValue = this.upstream.get()
		const newUpstreamValue: E[] = [...oldUpstreamValue]
		const oldElementValue = newUpstreamValue[downstreamBox.index]
		newUpstreamValue[downstreamBox.index] = value
		this.lastKnownUpstreamValue = newUpstreamValue
		this.upstream.set(newUpstreamValue, this, {type: "array_item_update", index: downstreamBox.index, oldValue: oldElementValue})
	}

	onDownstreamSubscription(): void {
		this.childSubCount++
		if(this.childSubCount === 1){
			this.upstream.subscribe(this)
		}
	}

	onDownstreamUnsubscription(): void {
		this.childSubCount--
		if(this.childSubCount === 0){
			this.unsubscribeFromUpstream()
		}
	}

	private unsubscribeFromUpstream(): void {
		this.upstream.unsubscribe(this)
	}

	getBoxes(): ArrayItemBox<E, K>[] {
		this.tryUpdate()
		const upstreamValue = this.upstream.get()
		const result: ArrayItemBox<E, K>[] = new Array(upstreamValue.length)
		for(let i = 0; i < upstreamValue.length; i++){
			const oldValue = upstreamValue[i]!
			const key = this.getKey(oldValue, i)
			const pair = this.pairs.get(key)
			if(!pair){
				// should realistically never happen
				throw new Error("Cannot get array item box list: no downstream box for key " + key)
			}
			result[i] = pair.box
		}
		return result
	}

	getBoxForKey(key: K): ArrayItemBox<E, K> {
		this.tryUpdate()
		const pair = this.pairs.get(key)
		if(!pair){
			throw new Error("No box for key " + key)
		}
		return pair.box
	}

	isItemBoxAttached(itemBox: RBox<unknown>): boolean {
		return itemBox instanceof ArrayItemBox
			? this.pairs.get(itemBox.key)?.box === itemBox
			: this.mappedValueBox === itemBox
	}

	dispose(): void {
		this.lastKnownUpstreamValue = null // to trigger update next time
		for(const pair of this.pairs.values()){
			pair.box.dispose()
		}
	}

	toString(): string {
		return `ArrayContext(${this.getKey})`
	}

	getValueArrayBox(): ArrayContextControlledBox<readonly V[]> {
		if(!this.mappedValueBox){
			this.mappedValueBox = new ArrayContextControlledBox<readonly V[]>(this, this.makeValuesArray())
		}
		return this.mappedValueBox
	}

	private makeValuesArray(): readonly V[] {
		this.tryUpdate()
		if(!this.lastKnownUpstreamValue){
			// should not happen
			throw new Error("Array context update failed: no known upstream value (wtf?)")
		}
		const values: V[] = new Array(this.pairs.size)
		for(let i = 0; i < this.lastKnownUpstreamValue.length; i++){
			// oof. wonder if there's a better way
			values[i] = this.pairs.get(this.getKey(this.lastKnownUpstreamValue[i]!, i))!.value
		}
		return values
	}

}