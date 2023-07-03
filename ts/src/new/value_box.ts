import {ChangeHandler, WBox} from "src/new/types"

export class ValueBox<T> implements WBox<T> {

	private readonly subscriptions = new Set<ChangeHandler<T>>()

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

		this.value = newValue
		this.callSubscribers(newValue)
	}

	subscribe(handler: ChangeHandler<T>): void {
		this.subscriptions.add(handler)
	}

	unsubscribe(handler: ChangeHandler<T>): void {
		this.subscriptions.delete(handler)
	}

	private callSubscribers(value: T): void {
		for(const subscriber of this.subscriptions){
			subscriber(value)
		}
	}
}