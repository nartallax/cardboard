type CallCounter<T> = ((value: T) => void) & {callCount: number, lastCallValue: T | null}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function makeCallCounter<T = any>(name?: string): CallCounter<T> {
	const res: CallCounter<T> = (value: T) => {
		res.callCount++
		res.lastCallValue = value
	}
	res.toString = () => `CallCounter(${name ?? "unnamed"})`
	res.callCount = 0
	res.lastCallValue = null
	return res
}

export function getExecutionTime(callback: () => void): number {
	const start = performance.now()
	callback()
	return performance.now() - start
}

export function expectExecutionTimeLessThan(developerComputerTiming: number, ms: number, callback: () => void): number {
	const time = getExecutionTime(callback)
	if(time > ms){
		throw new Error(`Performance test failed, execution takes too long: ${Math.floor(time)}ms; expected no more than ${ms}ms (and ${developerComputerTiming}ms realistically)`)
	}
	return time
}

export type IfTypeEquals<A, B> = A extends B ? B extends A ? true : false : false