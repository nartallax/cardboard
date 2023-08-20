import {anythingToString, StaticDependencyList, RBox, BoxInternal, DownstreamBox, SingleDependencyList, Unboxed} from "src/internal"

// type DependencyBoxes<D extends readonly unknown[]> = D extends [infer X, ...infer Rest]
// 	? readonly [RBox<X>, ...DependencyBoxes<Rest>]
// 	: D extends []
// 		? []
// 		: readonly RBox<D[number]>[]
type DependencyBoxValues<D> = D extends [infer X, ...infer Rest]
	? readonly [Unboxed<X>, ...DependencyBoxValues<Rest>]
	: D extends []
		? []
		: D extends readonly RBox<unknown>[]
			? readonly Unboxed<D[number]>[]
			: never

// TODO: think of a better name? it's not a view, it's something different
/** Make new view box, readonly box that calculates its value based on passed function */
export const viewBox = <T, D extends readonly RBox<unknown>[]>(dependencies: D, calcFunction: (...dependencyValues: DependencyBoxValues<D>) => T): RBox<T> => {
	return new ViewBox(dependencies as unknown as readonly BoxInternal<unknown>[], calcFunction as unknown as (...args: unknown[]) => T)
}

export class ViewBox<T> extends DownstreamBox<T> {

	// TODO: consider doing the same for MapBox
	// this could potentially reduce confusion about untimely calls of mapboxes
	forcedShouldRecalculate = false

	constructor(dependencies: readonly BoxInternal<unknown>[], readonly calculateFn: (...args: unknown[]) => T) {
		super(dependencies.length === 1 ? new SingleDependencyList(dependencies[0]!) : new StaticDependencyList(dependencies))
	}

	toString(): string {
		return `${this.name ?? "ViewBox"}(${anythingToString(this.value)})`
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