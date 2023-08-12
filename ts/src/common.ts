import {ConstBoxImpl, constBox, WBox, RBox, Boxed, Unboxed, ValueBox, PropWBox, ArrayItemWBoxImpl, MapWBox, BaseBox, ArrayItemWBox, updateQueue, ConstBox, MRBox} from "src/internal"

/** Wrap a value in a const box, if the value is not a box; otherwise return that box as is */
export function constBoxWrap<T>(boxOrValue: RBox<T>): RBox<T>
export function constBoxWrap<T>(boxOrValue: T): Boxed<T>
export function constBoxWrap<T>(boxOrValue: T): Boxed<T> {
	return (isRBox(boxOrValue) ? boxOrValue : constBox(boxOrValue)) as Boxed<T>
}

/** If the value is a box - returns the value stored inside; otherwise returns passed value */
export function unbox<T>(boxOrValue: RBox<T>): T
export function unbox<T>(boxOrValue: MRBox<T>): T
export function unbox<T>(boxOrValue: T): Unboxed<T> {
	return (isRBox(boxOrValue) ? boxOrValue.get() : boxOrValue) as Unboxed<T>
}

/** Checks if the value is a box.
 *
 * Note that every box supplied by this library is an RBox;
 * every WBox is an RBox, every const box is an RBox, etc */
export function isRBox<T>(value: RBox<T>): value is RBox<T>
export function isRBox<T>(value: MRBox<T>): value is RBox<T>
export function isRBox(value: unknown): value is RBox<unknown>
export function isRBox(value: unknown): value is RBox<unknown> {
	return value instanceof BaseBox || isConstBox(value)
}

/** Checks if the value is a writable box */
export function isWBox<T>(value: WBox<T>): value is WBox<T>
export function isWBox<T>(value: RBox<T>): value is WBox<T>
export function isWBox<T>(value: MRBox<T>): value is WBox<T>
export function isWBox(value: unknown): value is WBox<unknown>
export function isWBox(value: unknown): value is WBox<unknown> {
	return value instanceof ValueBox || value instanceof MapWBox || value instanceof PropWBox || value instanceof ArrayItemWBoxImpl
}

/** Checks if the value is a constant box.
 *
 * Constant box is a readonly box that will never change its value.
 * This allows sometimes to skip subscribing to this box alltogether and save some performance. */
export function isConstBox<T>(value: MRBox<T>): value is ConstBox<T>
export function isConstBox<T>(value: RBox<T>): value is ConstBox<T>
export function isConstBox(value: unknown): value is ConstBox<unknown>
export function isConstBox(value: unknown): value is ConstBox<unknown> {
	return value instanceof ConstBoxImpl
}

export function isArrayItemWBox<T>(value: RBox<T>): value is ArrayItemWBox<T>
export function isArrayItemWBox<T>(value: MRBox<T>): value is ArrayItemWBox<T>
export function isArrayItemWBox(value: unknown): value is ArrayItemWBox<unknown>
export function isArrayItemWBox(value: unknown): value is ArrayItemWBox<unknown> {
	return value instanceof ArrayItemWBoxImpl
}

export function anythingToString(x: unknown): string {
	if(typeof(x) === "symbol"){
		return x.toString()
	} else {
		return JSON.stringify(x)
	}
}

/** Stops subscribers from being called until the callback is completed.
 * Updates are delivered to subscribers after that.
 * Can be used in cases when you need to do updates to several unrelated boxes and need to make sure that no extra work is done */
export const withBoxUpdatesPaused = <T>(callback: () => T): T => updateQueue.withUpdatesPaused(callback)