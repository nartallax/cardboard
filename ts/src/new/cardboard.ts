import {RBox, WBox} from "src/new/types"
import {ValueBox} from "src/new/value_box"

export const box = <T>(value: T): WBox<T> => {
	return new ValueBox(value)
}

// TODO: test if the returned value type is inferred properly
export const isRBox = (value: unknown): value is RBox<unknown> => {
	return value instanceof ValueBox
}

export const isWBox = (value: unknown): value is WBox<unknown> => {
	return value instanceof ValueBox
}

export function unbox<T>(x: RBox<T> | T): T
export function unbox<T>(x: RBox<T> | T | undefined): T | undefined
export function unbox<T>(x: RBox<T> | T | null): T | null
export function unbox<T>(x: RBox<T> | T | null | undefined): T | null | undefined
export function unbox<T>(x: RBox<T> | T): T {
	return isRBox(x) ? x.get() : x
}