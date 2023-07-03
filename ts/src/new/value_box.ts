import {ChangeHandler, Subscriber, WBox} from "src/new/types"

export class ValueBox<T> implements WBox<T> {

	private readonly subscriptions = new Map<ChangeHandler<T>, Subscriber<T>>()
	/** A revision is a counter that is incremented each time the value of the box is changed */
	private revision = 1

	constructor(private value: T) {}

	get isWBox(): true {
		return true
	}

	get isRBox(): true {
		return true
	}

	get(): T {
		return this.value
	}

	set(newValue: T): void {
		if(this.value === newValue){
			return
		}

		this.revision++
		this.value = newValue
		this.callSubscribers(newValue)
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