import {ConstBox} from "src/new/const_box"
import {WBox, RBox, MRBox} from "src/new/types"
import {ValueBox} from "src/new/value_box"

export const NoValue = Symbol("cardboard-no-value")

/** Make new basic writable box */
export const box = <T>(value: T): WBox<T> => {
	return new ValueBox(value)
}

/** Make new constant box, a readonly box which value never changes
 *
 * exists mostly for convenience, to avoid writing two variants of code - one for plain values and one for boxes */
export const constBox = <T>(value: T): RBox<T> => {
	return new ConstBox(value)
}

export function constBoxWrap<T>(value: WBox<T>): WBox<T>
export function constBoxWrap<T>(value: RBox<T>): RBox<T>
// formal logic tells us that this case should be covered by case above and below
// but it's not true (and there's a test for that)
// TODO: which test is that...?
export function constBoxWrap<T>(value: MRBox<T>): RBox<T>
export function constBoxWrap<T>(value: T): RBox<T>
/** Wrap a value in the const box, if it's not a box; if it is - return that box as is */
export function constBoxWrap<T>(value: T): WBox<T> | RBox<T> {
	return isRBox(value) ? value as RBox<T> : constBox(value)
}

// TODO: test if the returned value type is inferred properly
/** Checks if the value is a box.
 *
 * Note that every box supplied by this library is an RBox;
 * every WBox is an RBox, every const box is an RBox, etc*/
export const isRBox = (value: unknown): value is RBox<unknown> => {
	return isWBox(value) || isConstBox(value)
}

/** Checks if the value is a writable box */
export const isWBox = (value: unknown): value is WBox<unknown> => {
	return value instanceof ValueBox
}

/** Checks if the value is constant box.
 *
 * Constant box is a readonly box which will never change value.
 * This allows sometimes to skip subscribing to this box alltogether and save some performance. */
export const isConstBox = (value: unknown): value is RBox<unknown> => {
	return value instanceof ConstBox
}

export function unbox<T>(x: RBox<T> | T): T
export function unbox<T>(x: RBox<T> | T | undefined): T | undefined
export function unbox<T>(x: RBox<T> | T | null): T | null
export function unbox<T>(x: RBox<T> | T | null | undefined): T | null | undefined
export function unbox<T>(x: RBox<T> | T): T {
	return isRBox(x) ? x.get() : x
}