import {anythingToString, MultipleDependencyList, RBox, BoxInternal, DownstreamBox, SingleDependencyList, Unboxed} from "src/internal"

type DependencyBoxValues<D> = D extends [infer X, ...infer Rest]
	? readonly [Unboxed<X>, ...DependencyBoxValues<Rest>]
	: D extends []
		? []
		: D extends readonly RBox<unknown>[]
			? readonly Unboxed<D[number]>[]
			: never

/** Make new calc box, readonly box that calculates its value based on passed function */
export const calcBox = <T, D extends readonly RBox<unknown>[]>(dependencies: D, calcFunction: (...dependencyValues: DependencyBoxValues<D>) => T): RBox<T> => {
	return new CalcBox(dependencies as unknown as readonly BoxInternal<unknown>[], calcFunction as unknown as (...args: unknown[]) => T)
}

export class CalcBox<T> extends DownstreamBox<T> {

	// TODO: consider doing the same for MapBox
	// this could potentially reduce confusion about untimely calls of mapboxes
	forcedShouldRecalculate = false

	constructor(dependencies: readonly BoxInternal<unknown>[], readonly calculateFn: (...args: unknown[]) => T) {
		super(dependencies.length === 1 ? new SingleDependencyList(dependencies[0]!) : new MultipleDependencyList(dependencies))
	}

	toString(): string {
		return `${this.name ?? "CalcBox"}(${anythingToString(this.value)})`
	}

	calculate(): T {
		this.forcedShouldRecalculate = false
		const values = this.dependencyList.getDependencyValues()
		return this.calculateFn(...values)
	}

	protected override shouldRecalculate(): boolean {
		if(this.forcedShouldRecalculate){
			return true
		}

		return super.shouldRecalculate()
	}

}