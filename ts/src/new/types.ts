export type ChangeHandler<T> = (value: T) => void

/** Maybe RBox - RBox or non-boxed value */
export type MRBox<T> = RBox<T> | T

/** Readonly box: a box which contents you can get, but cannot directly put anything into. */
export interface RBox<T>{
	/** Get the value that is stored in this box. */
	get(): T

	/** Subscribe to receive new value every time it changes.
	 * One function may only be added once as a handler;
	 * subscribing second time with the same function does nothing. TODO: write test for this
	 *
	 * Note that the handler is stored until explicitly unsubscribed;
	 * this may cause memory leaks in some scenarios. */
	subscribe(handler: ChangeHandler<T>): void

	/** Removes a subscriber from the box */
	unsubscribe(handler: ChangeHandler<T>): void
}

/** Writable box: a box in which you can put value, and get value from. */
export interface WBox<T> extends RBox<T> {
	/** Put the value in the box, overwriting existing value and calling all the change handlers. */
	set(value: T): void
}