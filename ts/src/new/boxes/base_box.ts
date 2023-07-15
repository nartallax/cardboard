import {NotificationStack, ChangeHandler, Subscriber, WBox} from "src/new/internal"

export const notificationStack = new NotificationStack()

export abstract class BaseBox<T> implements WBox<T> {
	private readonly subscriptions = new Map<ChangeHandler<T>, Subscriber<T>>()
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
		return this.subscriptions.size > 0
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
		this.subscriptions.set(handler, {lastKnownValue: this.value})
	}

	unsubscribe(handler: ChangeHandler<T>): void {
		this.subscriptions.delete(handler)
	}

	private callSubscribers(value: T): void {
		const startingRevision = this.revision
		for(const [handler, subscriber] of this.subscriptions){
			if(subscriber.lastKnownValue !== value){
				subscriber.lastKnownValue = value
				handler(value)
			}
			if(this.revision !== startingRevision){
				// some of the subscribers changed value of the box;
				// it doesn't make sense to proceed further in this round of calls,
				// because there is another round of calls probably in progress, or maybe even already completed
				break
			}
		}
	}

}