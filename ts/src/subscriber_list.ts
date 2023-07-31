import {type ChangeHandler, type BoxInternal, type UpstreamSubscriber, UpdateMeta, PropBox} from "src/internal"

const enum UpdateFlag {
	haveOngoing = 1 << 0,
	haveQueued = 1 << 1
}

interface Subscription<T> {
	/** Last value with which handler was called.
	 * Having just a revision number won't do here, because value can go back-and-forth
	 * within one update session.
	 *
	 * This field must always contain value;
	 * when someone subscribes, it must be initiated with current value of the box.
	 * This is required to maintain the behaviour that subscriber knows what value the box had
	 * right before the subscription happens; so the call with the very same value could not happen in the next update.
	 *
	 * This shouldn't create noticeable memory leak, because it will either refer to NoValue,
	 * or to the same value as the box already has; it will only be different within update rounds */
	lastKnownValue: T
}

interface PropSubscription<T> extends Subscription<T> {
	readonly box: UpstreamSubscriber
}


/** Class that manages list of active subscribers to some box */
export class SubscriberList<T, O extends BoxInternal<T>> {
	private subscriptions: Map<ChangeHandler<T, O>, Subscription<T>> | null = null
	private internalSubscriptions: Map<UpstreamSubscriber, Subscription<T>> | null = null
	private propBoxInternalSubscriptions: Map<unknown, PropSubscription<T>[]> | null = null

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
	private updateStatus = 0

	constructor(private readonly owner: O) {}

	haveSubscribers(): boolean {
		return !!(this.subscriptions || this.internalSubscriptions || this.propBoxInternalSubscriptions)
	}

	/** Call subscribers with value.
	 *
	 * Returns true if all the subscribers were called successfully.
	 * Returns false if this update happened during another ongoing update;
	 * that means some (all?) of the subscribers will be called in the future and wasn't called during this call
	 *
	 * That also means that somewhere is ongoing notification call, which will be finished after this call
	 * And if a box needs to do something strictly after all notification calls are finished -
	 * then this box should wait for `true` to be returned */
	callSubscribers(changeSourceBox?: BoxInternal<unknown> | UpstreamSubscriber, updateMeta?: UpdateMeta): boolean {
		if((this.updateStatus & UpdateFlag.haveOngoing) !== 0){
			this.updateStatus |= UpdateFlag.haveQueued
			return false
		}
		this.updateStatus |= UpdateFlag.haveOngoing

		this.notifyInternalSubscribers(changeSourceBox, updateMeta)
		this.notifyPropSubscribers(changeSourceBox, updateMeta)

		if((this.updateStatus & UpdateFlag.haveQueued) !== 0){
			this.updateStatus = 0
			/* on nested (double) subscriber notification we explicitly do not pass source box or update meta
			because we don't store neither update source nor meta for the last update
			and if we pass what we have - we'll be wrong, because they are not the source of the latest change.

			also, we need to trigger full update and not partial update,
			otherwise there could be situations when update just never arrives */
			this.callSubscribers()
			return true
		}

		this.notifyExternalSubscribers()

		if((this.updateStatus & UpdateFlag.haveQueued) !== 0){
			this.updateStatus = 0
			this.callSubscribers()
			return true
		}

		this.updateStatus = 0
		return true
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
			const value = this.owner.getExistingValue()
			if(box === changeSourceBox){
				// that box already knows what value of this box should be
				subscription.lastKnownValue = value
				continue
			}
			if(subscription.lastKnownValue !== value){
				subscription.lastKnownValue = value
				box.onUpstreamChange(this.owner, updateMeta)
			}
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

	private notifyPropSubscriptionArray(arr: PropSubscription<T>[], changeSourceBox?: BoxInternal<unknown> | UpstreamSubscriber, updateMeta?: UpdateMeta): void {
		for(let i = 0; i < arr.length; i++){
			const value = this.owner.getExistingValue()
			const subscription = arr[i]!
			if(subscription.box === changeSourceBox){
				subscription.lastKnownValue = value
				continue
			}
			if(subscription.lastKnownValue !== value){
				subscription.lastKnownValue = value
				subscription.box.onUpstreamChange(this.owner, updateMeta)
			}
		}
	}

	private notifyExternalSubscribers(): void {
		if(!this.subscriptions){
			return
		}

		for(const [handler, subscription] of this.subscriptions){
			const value = this.owner.getExistingValue()
			if(subscription.lastKnownValue !== value){
				subscription.lastKnownValue = value
				handler(value, this.owner)
			}
		}
	}

	subscribe(handler: ChangeHandler<T, O>, lastKnownValue: unknown): void {
		(this.subscriptions ||= new Map()).set(handler, {lastKnownValue})
	}

	subscribeInternal(box: UpstreamSubscriber, lastKnownValue: unknown): void {
		if(box instanceof PropBox){
			const map = this.propBoxInternalSubscriptions ||= new Map()
			let arr = map.get(box.propName)
			if(!arr){
				arr = []
				map.set(box.propName, arr)
			}
			arr.push({lastKnownValue, box})
			return
		}

		(this.internalSubscriptions ||= new Map()).set(box, {lastKnownValue})
	}

	unsubscribe(handler: ChangeHandler<T, O>): void {
		if(!this.subscriptions){
			return
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

			arr = arr.filter(sub => sub.box !== box)
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