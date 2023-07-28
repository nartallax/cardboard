import type {ChangeHandler, RBoxInternal, Subscriber, UpstreamSubscriber, WBoxInternal} from "src/new/internal"

/** Class that manages list of active subscribers to some box */
export class SubscriberList<T, O extends WBoxInternal<T>> {
	private subscriptions: Map<ChangeHandler<T, O>, Subscriber<T>> | null = null
	private internalSubscriptions: Map<UpstreamSubscriber, Subscriber<T>> | null = null

	constructor(private readonly owner: O) {}

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
	callSubscribers(value: T, changeSourceBox?: RBoxInternal<unknown>): boolean {
		const startingRevision = ++this.revision

		if(this.internalSubscriptions){
			for(const [box, subscriber] of this.internalSubscriptions){
				// FIXME: cringe. think about better typing all this stuff. maybe throwing away some abstractness?
				if(box as unknown === changeSourceBox){
					// that box already knows what value of this box should be
					subscriber.lastKnownValue = value
					continue
				}
				if(subscriber.lastKnownValue !== value){
					subscriber.lastKnownValue = value
					box.onUpstreamChange(this.owner)
				}
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
					handler(value, this.owner)
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
		// TODO: don't create object here? it's just one value
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