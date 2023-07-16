import {ChangeHandler, InternalSubscriber, RBox, RBoxInternal, Subscriber, ViewBox, WBox, notificationStack} from "src/new/internal"

export abstract class BaseBox<T> implements WBox<T>, RBoxInternal<T> {
	private subscriptions: Map<ChangeHandler<T>, Subscriber<T>> | null = null
	// TODO: do we really need ChangeHandler here? maybe I can do it in a more optimal way?
	private internalSubscriptions: Map<ChangeHandler<T>, InternalSubscriber<T>> | null = null
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

	constructor(protected value: T) {}

	haveSubscribers(): boolean {
		return !!(this.subscriptions || this.internalSubscriptions)
	}

	set(newValue: T): void {
		if(this.value === newValue){
			return
		}

		this.revision++
		this.value = newValue
		this.callSubscribers(newValue)
	}

	get(): T {
		notificationStack.notify(this, this.value)
		return this.value
	}

	subscribe(handler: ChangeHandler<T>): void {
		(this.subscriptions ||= new Map()).set(handler, {lastKnownValue: this.value})
	}

	unsubscribe(handler: ChangeHandler<T>): void {
		if(!this.subscriptions){
			return
		}

		this.subscriptions.delete(handler)
		if(this.subscriptions.size === 0){
			this.subscriptions = null
		}
	}

	subscribeInternal(handler: ChangeHandler<T>, box: RBox<unknown>): void {
		(this.internalSubscriptions ||= new Map()).set(handler, {lastKnownValue: this.value, box})
	}

	unsubscribeInternal(handler: ChangeHandler<T>): void {
		if(!this.internalSubscriptions){
			return
		}

		this.internalSubscriptions.delete(handler)
		if(this.internalSubscriptions.size === 0){
			this.internalSubscriptions = null
		}
	}

	private callSubscribers(value: T, excludeBox?: RBox<unknown>): void {
		const startingRevision = this.revision

		if(this.internalSubscriptions){
			for(const [handler, subscriber] of this.internalSubscriptions){
				if(subscriber.box === excludeBox){
					continue
				}
				if(subscriber.lastKnownValue !== value){
					subscriber.lastKnownValue = value
					handler(value)
				}
				if(this.revision !== startingRevision){
					// some of the subscribers changed value of the box;
					// it doesn't make sense to proceed further in this round of calls,
					// because there is another round of calls probably in progress, or maybe even already completed
					return
				}
			}
		}

		if(this.subscriptions){
			for(const [handler, subscriber] of this.subscriptions){
				if(subscriber.lastKnownValue !== value){
					subscriber.lastKnownValue = value
					handler(value)
				}
				if(this.revision !== startingRevision){
					return
				}
			}
		}
	}

	map<R>(mapper: (value: T) => R): RBox<R> {
		return new ViewBox(() => mapper(this.get()), [this])
	}

}