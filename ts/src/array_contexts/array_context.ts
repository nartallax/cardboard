import {notificationStack, isWBox, ArrayItemBox, UpstreamSubscriber, BoxInternal, ArrayItemRBox, ArrayItemWBox, ArrayContext, RBox, WBox, UpdateMeta} from "src/internal"

/** This class controls a set of boxes that contain items of some array box
 * Links upstream array box with downstream item boxes
 *
 * In theory, we could live without this class,
 * but this means item boxes will need to perform a lot of checking every update
 * which is undesirable, because it's a performance hit */
export class ArrayContextImpl<E, K> implements UpstreamSubscriber, ArrayContext<E, K, ArrayItemBox<E, K>> {
	private readonly boxes = new Map<K, ArrayItemBox<E, K>>()
	private childSubCount = 0
	private lastKnownUpstreamValue: E[] | null = null

	constructor(readonly upstream: BoxInternal<E[]>, private readonly getKey: (element: E, index: number) => K) {
	}

	tryUpdate(): void {
		if(this.childSubCount > 0){
			// the same logic as in viewbox - if we are being subscribed to, then we are subscribed to upstream
			// that means our value is up-to-date
			return
		}
		const upstreamArray = notificationStack.getWithoutNotifications(this.upstream)
		if(upstreamArray !== this.lastKnownUpstreamValue){
			this.onUpstreamChange(this.upstream, undefined, upstreamArray)
		}
	}

	onUpstreamChange(_: BoxInternal<unknown>, updateMeta?: UpdateMeta, upstreamArray?: E[]): void {
		upstreamArray ??= notificationStack.getWithoutNotifications(this.upstream)
		this.lastKnownUpstreamValue = upstreamArray

		if(updateMeta){
			if(updateMeta.type === "array_item_update"){
				const item = upstreamArray[updateMeta.index]!
				const key = this.getKey(item, updateMeta.index)
				const box = this.boxes.get(key)
				if(!box){
					throw new Error(`Update meta points to update of array item at index ${updateMeta.index}; the key for this index is ${key}, but there's no box for this key. Either key generation logic is flawed, or there's bug in the library.`)
				}
				box.set(item, this.upstream)
				return
			}

			if(updateMeta.type === "array_item_insert"){
				const item = upstreamArray[updateMeta.index]!
				const key = this.getKey(item, updateMeta.index)
				if(this.boxes.get(key)){
					throw new Error("Duplicate key: " + key)
				}
				// it doesn't make much sense for upstream to be readonly when it is updated by item insert
				// but let's check anyway
				const box = !isWBox(this.upstream)
					? new ArrayItemRBox<E, K>(this, item, updateMeta.index, key)
					: new ArrayItemWBox<E, K>(this, item, updateMeta.index, key)
				this.boxes.set(key, box)
				return
			}

			if(updateMeta.type === "array_items_delete"){
				for(const {index, value} of updateMeta.indexValuePairs){
					const key = this.getKey(value as E, index)
					const box = this.boxes.get(key)
					if(!box){
						throw new Error("Tried to delete item at key " + key + ", but there's no item for that key.")
					}
					box.dispose()
					this.boxes.delete(key)
				}
				return
			}
		}

		const isReadonly = !isWBox(this.upstream)
		const outdatedKeys = new Set(this.boxes.keys())
		for(let index = 0; index < upstreamArray.length; index++){
			const item = upstreamArray[index]!
			const key = this.getKey(item, index)
			let box = this.boxes.get(key)
			if(box){
				if(!outdatedKeys.has(key)){
					throw new Error("Constraint violated, key is not unique: " + key)
				}
				box.set(item, this.upstream)
				box.index = index
			} else {
				box = isReadonly
					? new ArrayItemRBox<E, K>(this, item, index, key)
					: new ArrayItemWBox<E, K>(this, item, index, key)
				this.boxes.set(key, box)
			}

			outdatedKeys.delete(key)
		}

		for(const key of outdatedKeys){
			const box = this.boxes.get(key)!
			box.dispose()
			this.boxes.delete(key)
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

		const oldUpstreamValue = notificationStack.getWithoutNotifications(this.upstream)
		const newUpstreamValue: E[] = [...oldUpstreamValue]
		newUpstreamValue[downstreamBox.index] = value
		this.lastKnownUpstreamValue = newUpstreamValue
		this.upstream.set(newUpstreamValue, this, {type: "array_item_update", index: downstreamBox.index})
	}

	onDownstreamSubscription(): void {
		this.childSubCount++
		if(this.childSubCount === 1){
			this.upstream.subscribeInternal(this)
		}
	}

	onDownstreamUnsubscription(): void {
		this.childSubCount--
		if(this.childSubCount === 0){
			this.unsubscribeFromUpstream()
		}
	}

	private unsubscribeFromUpstream(): void {
		this.upstream.unsubscribeInternal(this)
	}

	getBoxes(): ArrayItemBox<E, K>[] {
		this.tryUpdate()
		const upstreamValue = notificationStack.getWithoutNotifications(this.upstream)
		const result: ArrayItemBox<E, K>[] = new Array(upstreamValue.length)
		for(let i = 0; i < upstreamValue.length; i++){
			const oldValue = upstreamValue[i]!
			const key = this.getKey(oldValue, i)
			const box = this.boxes.get(key)
			if(!box){
				// should realistically never happen
				throw new Error("Cannot get array item box list: no downstream box for key " + key)
			}
			result[i] = box
		}
		return result
	}

	getBoxForKey(key: K): ArrayItemBox<E, K> {
		this.tryUpdate()
		const box = this.boxes.get(key)
		if(!box){
			throw new Error("No box for key " + key)
		}
		return box
	}

	mapArray<R>(mapper: (item: E, index: number) => R): RBox<R[]>
	mapArray<R>(mapper: (item: E, index: number) => R, reverseMapper: (item: R, index: number) => E): WBox<R[]>
	mapArray<R>(mapper: (item: E, index: number) => R, reverseMapper?: (item: R, index: number) => E): RBox<R[]> | WBox<R[]> {
		const forwardCache = new Map<E, R>()
		const backwardCache: Map<R, E> | null = !reverseMapper ? null : new Map()

		const forwardMap = (upstreamValues: E[]) => {
			const outdatedUpstreamItems = new Set(forwardCache.keys())
			const result = upstreamValues.map((upstreamItem, index) => {
				outdatedUpstreamItems.delete(upstreamItem)
				let downstreamItem = forwardCache.get(upstreamItem)
				if(!downstreamItem){
					downstreamItem = mapper(upstreamItem, index)
					forwardCache.set(upstreamItem, downstreamItem)
					if(backwardCache){
						backwardCache.set(downstreamItem, upstreamItem)
					}
				}
				return downstreamItem
			})
			if(backwardCache){
				for(const outdatedItem of outdatedUpstreamItems){
					backwardCache.delete(forwardCache.get(outdatedItem)!)
				}
			}
			for(const outdatedItem of outdatedUpstreamItems){
				forwardCache.delete(outdatedItem)
			}
			return result
		}

		if(!backwardCache || !reverseMapper){
			return this.upstream.map(forwardMap)
		}

		const backwardMap = (downstreamValues: R[]) => {
			const outdatedDownstreamItems = new Set(backwardCache.keys())
			const result = downstreamValues.map((downstreamItem, index) => {
				outdatedDownstreamItems.delete(downstreamItem)
				let upstreamItem = backwardCache.get(downstreamItem)
				if(!upstreamItem){
					upstreamItem = reverseMapper(downstreamItem, index)
					forwardCache.set(upstreamItem, downstreamItem)
					backwardCache.set(downstreamItem, upstreamItem)
				}
				return upstreamItem
			})
			for(const outdatedItem of outdatedDownstreamItems){
				forwardCache.delete(backwardCache.get(outdatedItem)!)
				backwardCache.delete(outdatedItem)
			}
			return result
		}
		return this.upstream.map(forwardMap, backwardMap)
	}

	isItemBoxAttached(itemBox: ArrayItemBox<E, K>): boolean {
		return this.boxes.get(itemBox.key) === itemBox
	}

	dispose(): void {
		this.lastKnownUpstreamValue = null // to trigger update next time
		for(const child of this.boxes.values()){
			child.dispose()
		}
	}

}