import type {ChangeHandler, BoxInternal, Subscription, UpstreamSubscriber} from "src/internal"

/** Class that manages list of active subscribers to some box */
export class SubscriberList<T, O extends BoxInternal<T>> {
	private subscriptions: Map<ChangeHandler<T, O>, Subscription<T>> | null = null
	private internalSubscriptions: Map<UpstreamSubscriber, Subscription<T>> | null = null

	/** A revision is a counter that is incremented each time the value of the box is changed
	 *
	 * This value must never be visible outside of this box.
	 * It can only be used to prevent repeated calls of subscribers.
	 *
	 * It is very tempting to use revision number to check if value is changed or not
	 * However, it can go wrong when value does not change until you explicitly check
	 * For example, consider viewBox that depends on viewBox
	 * When there is no subscribers, first viewBox will never change, regardless of its sources
	 * And if you're only relying on revision number to check if it is changed, you'll be wrong
	 *
	 * And also value can change back and forth within one calculation, and revision will still be incremented;
	 * that's why if you rely on revision to check if the value changed you'll get some false-positives */
	private revision = 1

	haveSubscribers(): boolean {
		return !!(this.subscriptions || this.internalSubscriptions)
	}

	/** Call subscribers; returns true if there was no change during subscriber calls */
	callSubscribers(value: T, owner: O, changeSourceBox?: BoxInternal<unknown> | UpstreamSubscriber): boolean {
		const startingRevision = ++this.revision

		if(this.internalSubscriptions){
			for(const [box, subscriber] of this.internalSubscriptions){
				if(box === changeSourceBox){
					// that box already knows what value of this box should be
					subscriber.lastKnownValue = value
					continue
				}
				if(subscriber.lastKnownValue !== value){
					subscriber.lastKnownValue = value
					box.onUpstreamChange(owner)
				}
				/** This line, right here, is the reason why there's no partial updates.
				 *
				 * Partial update should only be dropped if there is a full update over that partial update
				 * If there is another partial update, both should be delivered... unless they are about same thing
				 * And also "obsolete-but-not-dropped" partial update should not be delivered to box that could not process partial update
				 * because then that box will, at best, double-calc (and get wrong value at worst)
				 *
				 * It can be partially mitigated by making updates strictly sequental (don't do new update until old update is completed)
				 * but this will lead to confusing situation when subscriber is called, but value passed is not the same value that box contains
				 * (also this is not performant and counter-intuitive)
				 *
				 * So yeah, partial updates are hard to get right. That's why there are no partial updates. */
				if(this.revision !== startingRevision){
					// some of the subscribers changed value of the box;
					// it doesn't make sense to proceed further in this round of calls,
					// because there is another round of calls probably in progress, or maybe even already completed
					return false
				}
			}
		}

		if(this.subscriptions){
			for(const [handler, subscriber] of this.subscriptions){
				if(subscriber.lastKnownValue !== value){
					subscriber.lastKnownValue = value
					handler(value, owner)
				}
				if(this.revision !== startingRevision){
					return false
				}
			}
		}

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