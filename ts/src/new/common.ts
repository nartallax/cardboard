import {ConstBox, constBox, WBox, RBox, Boxed, Unboxed, ValueBox, ViewBox, MapBox} from "src/new/internal"

/** Wrap a value in a const box, if the value is not a box; otherwise return that box as is */
export const constBoxWrap = <T>(boxOrValue: T): Boxed<T> => {
	return (isRBox(boxOrValue) ? boxOrValue : constBox(boxOrValue)) as Boxed<T>
}

/** If the value is a box - returns the value stored inside; otherwise returns passed value */
export const unbox = <T>(boxOrValue: T): Unboxed<T> => {
	return (isRBox(boxOrValue) ? boxOrValue.get() : boxOrValue) as Unboxed<T>
}

/** Checks if the value is a box.
 *
 * Note that every box supplied by this library is an RBox;
 * every WBox is an RBox, every const box is an RBox, etc */
export const isRBox = (value: unknown): value is RBox<unknown> => {
	return isWBox(value) || isConstBox(value) || value instanceof ViewBox
}

/** Checks if the value is a writable box */
export const isWBox = (value: unknown): value is WBox<unknown> => {
	return value instanceof ValueBox || value instanceof MapBox
}

/** Checks if the value is a constant box.
 *
 * Constant box is a readonly box that will never change its value.
 * This allows sometimes to skip subscribing to this box alltogether and save some performance. */
export const isConstBox = (value: unknown): value is RBox<unknown> => {
	return value instanceof ConstBox
}