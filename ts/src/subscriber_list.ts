import {updateQueue, type ChangeHandler, type BoxInternal, type UpstreamSubscriber, UpdateMeta, PropBox, Subscription, Update} from "src/internal"

/** Class that manages list of active subscribers to some box */
export class SubscriberList<T, O extends BoxInternal<T>> {
	private subscriptions: Map<ChangeHandler<T> | UpstreamSubscriber, Subscription<T>> | null = null
	private propBoxInternalSubscriptions: Map<unknown, Subscription<T>[]> | null = null

	/** There once was a number field called `revision` here.
	 * As the library was going ahead with more and more complex calculations and logic, it became obsolete.
	 * Over and over again, idea of revision comes to my mind, just to be proven insufficient for anything.
	 * So, to save my brain power, here is a small description of what revisions cannot achieve.
	 *
	 * A revision is a counter that is incremented each time the value of the box is changed.
	 *
	 * It is very tempting to use revision number to check if value is changed or not.
	 * However, it can go wrong when value does not change until you explicitly check.
	 * For example, consider viewBox that depends on another viewBox
	 * When there is no subscribers, upstream viewBox will never change, regardless of its own upstreams
	 * And if downstream viewbox only relying on upstream viewbox's revision number to check if it is was changed,
	 * there will be false negatives, because in this case it is required to check dependencies of upstream viewbox more thorough.
	 *
	 * And also value can change back and forth within one calculation, and revision will still be incremented;
	 * that's why if you rely on revision to check if the value changed you'll get some false-positives.
	 *
	 * You can try to use revision to prevent calls of subscribers with outdated value;
	 * hovewer, it will also have bugs related to early-drops of things that should not be dropped,
	 * in cases of array contexts (there's a test for that) and partial updates */

	constructor(private readonly owner: O) {}

	haveSubscribers(): boolean {
		return !!(this.subscriptions || this.propBoxInternalSubscriptions)
	}

	callSubscribers(value: T, changeSourceBox: BoxInternal<unknown> | UpstreamSubscriber | undefined, updateMeta: UpdateMeta | undefined): void {
		this.notifyPropSubscribers(value, changeSourceBox, updateMeta)
		this.notifySubscribers(value, changeSourceBox, updateMeta)
		updateQueue.run()
	}

	private notifySubscribers(value: T, changeSourceBox?: BoxInternal<unknown> | UpstreamSubscriber, updateMeta?: UpdateMeta): void {
		if(!this.subscriptions){
			return
		}

		for(const subscription of this.subscriptions.values()){
			if(subscription.receiver === changeSourceBox){
				// that box already knows what value of this box should be
				// TODO: think about in which situation this can backfire and how to fix it
				// maybe we need to remove update from queue? but how this situation even possible?
				subscription.lastKnownValue = value
				continue
			}
			updateQueue.enqueueUpdate(new Update(subscription, value, this.owner, updateMeta))
		}
	}

	private notifyPropSubscribers(value: T, changeSourceBox: BoxInternal<unknown> | UpstreamSubscriber | undefined, updateMeta: UpdateMeta | undefined): void {
		if(!this.propBoxInternalSubscriptions){
			return
		}

		if(updateMeta && updateMeta.type === "property_update"){
			const propSubscriptionArray = this.propBoxInternalSubscriptions.get(updateMeta.propName)
			if(propSubscriptionArray){
				this.notifyPropSubscriptionArray(value, propSubscriptionArray, changeSourceBox, updateMeta)
			}
			return
		}

		for(const propSubscriptionArray of this.propBoxInternalSubscriptions.values()){
			this.notifyPropSubscriptionArray(value, propSubscriptionArray, changeSourceBox, updateMeta)
		}
	}

	private notifyPropSubscriptionArray(value: T, arr: Subscription<T>[], changeSourceBox?: BoxInternal<unknown> | UpstreamSubscriber, updateMeta?: UpdateMeta): void {
		for(let i = 0; i < arr.length; i++){
			const subscription = arr[i]!
			if(subscription.receiver === changeSourceBox){
				subscription.lastKnownValue = value
				continue
			}
			updateQueue.enqueueUpdate(new Update(subscription, value, this.owner, updateMeta))
		}
	}

	subscribe(handler: ChangeHandler<T> | UpstreamSubscriber, lastKnownValue: T): void {
		const sub: Subscription<T> = {lastKnownValue, receiver: handler}
		if(handler instanceof PropBox){
			const map: typeof this.propBoxInternalSubscriptions = this.propBoxInternalSubscriptions ||= new Map()

			let arr = map.get(handler.propName)
			if(!arr){
				arr = [sub]
				map.set(handler.propName, arr)
				return
			}

			for(let i = 0; i < arr.length; i++){
				if(arr[i]!.receiver === handler){
					return
				}
			}

			arr.push(sub)
			return
		}

		const map: typeof this.subscriptions = this.subscriptions ||= new Map()
		if(map.has(handler)){
			/** It's important to avoid creating new subscription objects if there are old ones
			 * Because update queue may hold reference to old object to update lastKnownValue
			 * and if new object is created for same handler/downstream, this update will be lost, which is bad */
			return
		}
		map.set(handler, sub)
	}

	unsubscribe(handler: ChangeHandler<T> | UpstreamSubscriber): void {
		if(handler instanceof PropBox){
			if(!this.propBoxInternalSubscriptions){
				return
			}

			let arr = this.propBoxInternalSubscriptions.get(handler.propName)
			if(!arr){
				return
			}

			let sub: Subscription<T> | null = null

			arr = arr.filter(x => {
				if(x.receiver === handler){
					sub = x
					return false
				}
				return true
			})

			if(sub){
				updateQueue.deleteUpdate(sub)
			}

			if(arr.length === 0){
				this.propBoxInternalSubscriptions.delete(handler.propName)
				if(this.propBoxInternalSubscriptions.size === 0){
					this.propBoxInternalSubscriptions = null
				}
			} else {
				this.propBoxInternalSubscriptions.set(handler.propName, arr)
			}
		}

		if(!this.subscriptions){
			return
		}

		this.subscriptions.delete(handler)
		if(this.subscriptions.size === 0){
			this.subscriptions = null
		}
	}

	dispose(): void {
		if(this.subscriptions){
			for(const downstream of this.subscriptions.keys()){
				if(typeof(downstream) !== "function"){
					downstream.dispose()
				}
			}
		}
	}

}