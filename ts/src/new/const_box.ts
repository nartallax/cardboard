import {ChangeHandler, RBox} from "src/new/types"

export class ConstBox<T> implements RBox<T> {
	constructor(private readonly value: T) {}

	get(): T {
		return this.value
	}

	subscribe(handler: ChangeHandler<T>): void {
		// handler will never be called, so we might as well drop it
		void handler
	}

	unsubscribe(handler: ChangeHandler<T>): void {
		void handler
	}
}