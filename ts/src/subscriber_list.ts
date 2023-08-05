import {updateQueue, type ChangeHandler, type BoxInternal, type UpstreamSubscriber, UpdateMeta, PropBox, Subscription, Update} from "src/internal"

/** Class that manages list of active subscribers to some box */
export class SubscriberList<T, O extends BoxInternal<T>> {
	private subscriptions: Map<ChangeHandler<T, O>, Subscription<T>> | null = null
	private internalSubscriptions: Map<UpstreamSubscriber, Subscription<T>> | null = null
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
		return !!(this.subscriptions || this.internalSubscriptions || this.propBoxInternalSubscriptions)
	}

	callSubscribers(changeSourceBox?: BoxInternal<unknown> | UpstreamSubscriber, updateMeta?: UpdateMeta): void {
		this.notifyInternalSubscribers(changeSourceBox, updateMeta)
		this.notifyPropSubscribers(changeSourceBox, updateMeta)
		this.notifyExternalSubscribers()
		updateQueue.run()
	}

	private notifyInternalSubscribers(changeSourceBox?: BoxInternal<unknown> | UpstreamSubscriber, updateMeta?: UpdateMeta): void {
		if(!this.internalSubscriptions){
			return
		}

		for(const [box, subscription] of this.internalSubscriptions){
			/* we get value each time here to avoid scenario when subscriber gets outdated value
			while it's not bad on its own (because subscriber will eventually get most up-to-date-value),
			it can confuse users of the library, if outdated value is passed into some kind of user handler
			it can lead to questions like "why box.get() is not equal to value passed into handler", which is fair

			it is only possible in case of double-changes; most of the time value will be the same */
			const value = this.owner.getExistingValue() // TODO: remove
			if(box === changeSourceBox){
				// that box already knows what value of this box should be
				subscription.lastKnownValue = value
				continue
			}
			updateQueue.enqueueUpdate(new Update(subscription, value, this.owner, updateMeta))
		}
	}

	private notifyPropSubscribers(changeSourceBox?: BoxInternal<unknown> | UpstreamSubscriber, updateMeta?: UpdateMeta): void {
		if(!this.propBoxInternalSubscriptions){
			return
		}

		if(updateMeta && updateMeta.type === "property_update"){
			const propSubscriptionArray = this.propBoxInternalSubscriptions.get(updateMeta.propName)
			if(propSubscriptionArray){
				this.notifyPropSubscriptionArray(propSubscriptionArray, changeSourceBox, updateMeta)
			}
			return
		}

		for(const propSubscriptionArray of this.propBoxInternalSubscriptions.values()){
			this.notifyPropSubscriptionArray(propSubscriptionArray, changeSourceBox, updateMeta)
		}
	}

	private notifyPropSubscriptionArray(arr: Subscription<T>[], changeSourceBox?: BoxInternal<unknown> | UpstreamSubscriber, updateMeta?: UpdateMeta): void {
		for(let i = 0; i < arr.length; i++){
			const value = this.owner.getExistingValue()
			const subscription = arr[i]!
			if(subscription.receiver === changeSourceBox){
				// TODO: think about in which situation this can backfire and how to fix it
				// maybe we need to remove update from queue? but how this situation even possible?
				subscription.lastKnownValue = value
				continue
			}
			updateQueue.enqueueUpdate(new Update(subscription, value, this.owner, updateMeta))
		}
	}

	private notifyExternalSubscribers(): void {
		if(!this.subscriptions){
			return
		}

		for(const subscription of this.subscriptions.values()){
			const value = this.owner.getExistingValue()
			// TODO: think about passing update meta to external subs
			updateQueue.enqueueUpdate(new Update(subscription, value, this.owner, undefined))
		}
	}

	subscribe(handler: ChangeHandler<T, O>, lastKnownValue: unknown): void {
		const map = this.subscriptions ||= new Map()
		if(!map.has(handler)){
			/** It's important to avoid creating new subscription objects if there are old ones
			 * Because update queue may hold reference to old object to update lastKnownValue
			 * and if new object is created for same handler/downstream, this update will be lost, which is bad */
			const sub: Subscription<unknown> = {lastKnownValue, receiver: handler as ChangeHandler<unknown>}
			map.set(handler, sub)
		}
	}

	subscribeInternal(box: UpstreamSubscriber, lastKnownValue: unknown): void {
		const sub: Subscription<unknown> = {lastKnownValue, receiver: box}
		if(box instanceof PropBox){
			const map = this.propBoxInternalSubscriptions ||= new Map()
			if(map.has(box)){
				return
			}

			let arr = map.get(box.propName)
			if(!arr){
				arr = []
				map.set(box.propName, arr)
			}
			arr.push(sub)
			return
		}

		const map = this.internalSubscriptions ||= new Map()
		if(map.has(box)){
			return
		}
		map.set(box, sub)
	}

	unsubscribe(handler: ChangeHandler<T, O>): void {
		if(!this.subscriptions){
			return
		}

		const sub = this.subscriptions.get(handler)
		if(sub){
			updateQueue.deleteUpdate(sub)
		}

		this.subscriptions.delete(handler)
		if(this.subscriptions.size === 0){
			this.subscriptions = null
		}
	}

	unsubscribeInternal(box: UpstreamSubscriber): void {
		if(box instanceof PropBox){
			if(!this.propBoxInternalSubscriptions){
				return
			}

			let arr = this.propBoxInternalSubscriptions.get(box.propName)
			if(!arr){
				return
			}

			let sub: Subscription<T> | null = null

			arr = arr.filter(x => {
				if(x.receiver === box){
					sub = x
					return false
				}
				return true
			})

			if(sub){
				updateQueue.deleteUpdate(sub)
			}

			if(arr.length === 0){
				this.propBoxInternalSubscriptions.delete(box.propName)
				if(this.propBoxInternalSubscriptions.size === 0){
					this.propBoxInternalSubscriptions = null
				}
			} else {
				this.propBoxInternalSubscriptions.set(box.propName, arr)
			}
		}

		if(!this.internalSubscriptions){
			return
		}

		this.internalSubscriptions.delete(box)
		if(this.internalSubscriptions.size === 0){
			this.internalSubscriptions = null
		}
	}

	dispose(): void {
		if(this.internalSubscriptions){
			for(const downstream of this.internalSubscriptions.keys()){
				downstream.dispose()
			}
		}
	}

}