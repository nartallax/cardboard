import {notificationStack, isWBox, ArrayItemBox, UpstreamSubscriber, BoxInternal, ArrayItemRBox, ArrayItemWBox, ArrayContext, RBox, WBox} from "src/new/internal"

/** This class controls a set of boxes that contain items of some array box
 * Links upstream array box with downstream item boxes
 *
 * In theory, we could live without this class,
 * but this means item boxes will need to perform a lot of checking every update
 * which is undesirable, because it's a performance hit */
export class ArrayContextImpl<E, K> implements UpstreamSubscriber, ArrayContext<E, K, ArrayItemBox<E, K>> {
	private readonly boxes = new Map<K, ArrayItemBox<E, K>>()
	private childSubCount = 0
	private readonly isReadonly: boolean
	private lastKnownUpstreamValue: E[] | null = null

	constructor(readonly upstream: BoxInternal<E[]>, private readonly getKey: (element: E, index: number) => K) {
		this.isReadonly = !isWBox(upstream)
	}

	tryUpdate(): void {
		const upstreamArray = notificationStack.getWithoutNotifications(this.upstream)
		if(upstreamArray !== this.lastKnownUpstreamValue){
			this.onUpstreamChange(this.upstream, upstreamArray)
		}
	}

	onUpstreamChange(_: BoxInternal<unknown>, upstreamArray?: E[]): void {
		const outdatedKeys = new Set(this.boxes.keys())

		upstreamArray ??= notificationStack.getWithoutNotifications(this.upstream)
		this.lastKnownUpstreamValue = upstreamArray

		for(let index = 0; index < upstreamArray.length; index++){
			const item = upstreamArray[index]!
			const key = this.getKey(item, index)
			let box = this.boxes.get(key)
			if(box){
				if(!outdatedKeys.has(key)){
					throw new Error("Constraint violated, key is not unique: " + key)
				}
				box.set(item, this.upstream)
			} else {
				box = this.isReadonly ? new ArrayItemRBox<E, K>(this) : new ArrayItemWBox<E, K>(this)
				box.value = item
				box.key = key
				this.boxes.set(key, box)
			}
			box.index = index

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
		this.upstream.set(newUpstreamValue)
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
			this.upstream.unsubscribeInternal(this)
		}
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
	}

}