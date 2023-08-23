import {anythingToString, MultipleDependencyList, RBox, BoxInternal, DownstreamBox, SingleDependencyList, Unboxed, MRBox} from "src/internal"

type DependencyBoxValues<D> = D extends readonly [infer X, ...infer Rest]
	? readonly [Unboxed<X>, ...DependencyBoxValues<Rest>]
	: D extends []
		? []
		: D extends readonly MRBox<unknown>[]
			? readonly Unboxed<D[number]>[]
			: never

/** Make new calc box, readonly box that calculates its value based on passed function */
export const calcBox = <T, const D extends readonly MRBox<unknown>[]>(dependencies: D, calcFunction: (...dependencyValues: DependencyBoxValues<D>) => T): RBox<T> => {
	// in theory, here we could check if any of the dependencies are actually non-const boxes
	// and if not - then we could create a const box
	// but that's a rare case, and also calling calcFunction right now will break contract - it should be called later
	// maybe later, when I'd justify having const box that lazily calculates its value once
	return new CalcBox(
		dependencies as unknown as readonly (unknown | BoxInternal<unknown>)[],
		calcFunction as unknown as (...args: unknown[]) => T
	)
}

export class CalcBox<T> extends DownstreamBox<T> {

	constructor(dependencies: readonly (unknown | BoxInternal<unknown>)[], readonly calculateFn: (...args: unknown[]) => T) {
		super(dependencies.length === 1 ? new SingleDependencyList(dependencies[0]!) : new MultipleDependencyList(dependencies))
	}

	toString(): string {
		return `${this.name ?? "CalcBox"}(${anythingToString(this.value)})`
	}

	override calculate(): T {
		const values = this.dependencyList.getDependencyValues()
		return this.calculateFn(...values)
	}
}