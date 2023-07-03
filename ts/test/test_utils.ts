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