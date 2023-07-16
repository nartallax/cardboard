import {RBox, RBoxInternal} from "src/new/internal"

/** Make a new constant box, a readonly box which value never changes
 *
 * It exists mostly for convenience, to avoid writing two variants of code -
 * one for plain values and one for boxes */
export const constBox = <T>(value: T): RBox<T> => {
	return new ConstBox(value)
}

export class ConstBox<T> implements RBoxInternal<T> {
	constructor(private readonly value: T) {}

	get(): T {
		return this.value
	}

	subscribe(): void {
		// nothing. handler will never be called anyway
	}

	subscribeInternal(): void {
		// nothing
	}

	unsubscribe(): void {
		// nothing. we don't do anything on subscription and might as well do nothing on unsubscription
	}

	unsubscribeInternal(): void {
		// nothing
	}

	map<R>(mapper: (value: T) => R): RBox<R> {
		return new ConstBox(mapper(this.value))
	}
}