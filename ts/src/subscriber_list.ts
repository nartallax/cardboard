import {type ChangeHandler, type BoxInternal, type Subscription, type UpstreamSubscriber} from "src/internal"

const enum UpdateFlag {
	haveOngoing = 1 << 0,
	haveQueued = 1 << 1
}

/** Class that manages list of active subscribers to some box */
export class SubscriberList<T, O extends BoxInternal<T>> {
	private subscriptions: Map<ChangeHandler<T, O>, Subscription<T>> | null = null
	private internalSubscriptions: Map<UpstreamSubscriber, Subscription<T>> | null = null

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
		return !!(this.subscriptions || this.internalSubscriptions)
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
	callSubscribers(value: T, changeSourceBox?: BoxInternal<unknown> | UpstreamSubscriber): boolean {
		if((this.updateStatus & UpdateFlag.haveOngoing) !== 0){
			this.updateStatus |= UpdateFlag.haveQueued
			return false
		}
		this.updateStatus |= UpdateFlag.haveOngoing

		if(this.internalSubscriptions){
			for(const [box, subscriber] of this.internalSubscriptions){
				if(box === changeSourceBox){
					// that box already knows what value of this box should be
					subscriber.lastKnownValue = value
					continue
				}
				if(subscriber.lastKnownValue !== value){
					subscriber.lastKnownValue = value
					box.onUpstreamChange(this.owner)
				}
			}
		}

		if((this.updateStatus & UpdateFlag.haveQueued) !== 0){
			this.updateStatus = 0
			this.callSubscribers(this.owner.getExistingValue())
			return true
		}

		if(this.subscriptions){
			for(const [handler, subscription] of this.subscriptions){
				if(subscription.lastKnownValue !== value){
					subscription.lastKnownValue = value
					handler(value, this.owner)
				}
				if((this.updateStatus & UpdateFlag.haveQueued) !== 0){
					/* one of the external subscribers have changed the value of the owner box
					that means we must stop notifying external subscribers, as `value` is not up-to-date,
					and starts queued update immediately

					we don't do it for internal subscribers, because internal subscribers could never generate such circular update
					and checking this for internal subscriber can sometimes drop a meaningful update entirely, which could be a bug */
					break
				}
			}
		}

		if((this.updateStatus & UpdateFlag.haveQueued) !== 0){
			this.updateStatus = 0
			this.callSubscribers(this.owner.getExistingValue())
			return true
		}

		this.updateStatus = 0
		return true
	}

	subscribe(handler: ChangeHandler<T, O>, lastKnownValue: unknown): void {
		(this.subscriptions ||= new Map()).set(handler, {lastKnownValue})
	}

	subscribeInternal(box: UpstreamSubscriber, lastKnownValue: unknown): void {
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