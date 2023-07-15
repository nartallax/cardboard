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

	/** Create another box, value of which entirely depends on value of this one box
	 *
	 * Even if other boxes are used in this box, they won't trigger recalculation */
	map<R>(mapper: (value: T) => R): RBox<R>
}

/** Writable box: a box in which you can put value, and get value from. */
export interface WBox<T> extends RBox<T> {
	/** Put the value in the box, overwriting existing value and calling all the change handlers. */
	set(value: T): void
}

/** Maybe RBox - RBox or non-boxed value */
export type MRBox<T> = RBox<T> | T

/** If the type is non-box - wrap it in RBox value
 *
 * Does the same to types that constBoxWrap() does to values */
export type Boxed<T> = TakeBoxes<T> | RBox<TakeNonBoxes<T>>
type TakeBoxes<T> = T extends RBox<any> ? T : never
type TakeNonBoxes<T> = T extends RBox<any> ? never : T

/** Returns the value type of the box, if T is the box; otherwise returns T
 *
 * Does the same to types that unbox() does to values */
export type Unboxed<T> = T extends RBox<infer X> ? X : T

export type ChangeHandler<T> = (value: T) => void
export interface Subscriber<T> {
	/** Last value with which handler was called.
	 * Having just a revision number won't do here, because value can go back-and-forth
	 * within one update session.
	 *
	 * This field must always contain value;
	 * when someone subscribes, it must be initiated with current value of the box.
	 * This is required to maintain the behaviour that subscriber knows what value the box had
	 * right before the subscription happens; so the call with the very same value could not happen in the next update.
	 *
	 * This shouldn't create noticeable memory leak, because it will either refer to NoValue,
	 * or to the same value as the box already has; it will only be different within update rounds */
	lastKnownValue: T
}