import {RBox} from "src/new/cardboard"

type CallCounter<T> = ((value: T) => void) & {callCount: number, lastCallValue: T | null}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function makeCallCounter<T = any>(): CallCounter<T> {
	const res: CallCounter<T> = (value: T) => {
		res.callCount++
		res.lastCallValue = value
	}
	res.callCount = 0
	res.lastCallValue = null
	return res
}

export type IfTypeEquals<A, B> = A extends B ? B extends A ? true : false : false

export interface InternalRBox<T> extends RBox<T> {
	haveSubscribers(): boolean
}