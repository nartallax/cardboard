import {ChangeHandler, RBox} from "src/new/types"

/** Make a new constant box, a readonly box which value never changes
 *
 * It exists mostly for convenience, to avoid writing two variants of code -
 * one for plain values and one for boxes */
export const constBox = <T>(value: T): RBox<T> => {
	return new ConstBox(value)
}

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