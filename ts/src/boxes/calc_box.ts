import {anythingToString, MultipleDependencyList, RBox, BoxInternal, DownstreamBox, SingleDependencyList, Unboxed, MRBox, BoxUpdateMeta, UpstreamSubscriber, WBox} from "src/internal"

type DependencyBoxValues<D> = D extends readonly [infer X, ...infer Rest]
	? readonly [Unboxed<X>, ...DependencyBoxValues<Rest>]
	: D extends []
		? readonly []
		: D extends readonly MRBox<unknown>[]
			? readonly Unboxed<D[number]>[]
			: never

export function calcBox<T, const D extends readonly MRBox<unknown>[]>(dependencies: D, calcFunction: (...dependencyValues: DependencyBoxValues<D>) => T): RBox<T>
// generics on this overload are a bit weird
// they are like that because that's the only way to infer result value of the function as tuple by default
// (and not an array)
export function calcBox<T, const D extends readonly MRBox<unknown>[], const R extends (boxValue: T, ...dependencyValues: DependencyBoxValues<D>) => DependencyBoxValues<D>>(dependencies: D, calcFunction: (...dependencyValues: DependencyBoxValues<D>) => T, reverseCalcFunction: R): WBox<T>
/** Make new calc box, readonly box that calculates its value based on passed function */
export function calcBox<T, const D extends readonly MRBox<unknown>[], const V extends DependencyBoxValues<D>>(dependencies: D, calcFunction: (...dependencyValues: V) => T, reverseCalcFunction?: (boxValue: T, ...dependencyValues: V) => V): RBox<T> {
	// in theory, here we could check if any of the dependencies are actually non-const boxes
	// and if not - then we could create a const box
	// but that's a rare case, and also calling calcFunction right now will break contract - it should be called later
	// maybe later, when I'd justify having const box that lazily calculates its value once
	return new CalcBox(
		dependencies as unknown as readonly (unknown | BoxInternal<unknown>)[],
		calcFunction as unknown as (...args: unknown[]) => T,
		reverseCalcFunction as unknown as (value: T, ...args: unknown[]) => unknown[]
	)
}

export class CalcBox<T> extends DownstreamBox<T> {

	constructor(dependencies: readonly (unknown | BoxInternal<unknown>)[], readonly calculateFn: (...args: unknown[]) => T, readonly reverseCalculateFn: ((value: T, ...args: unknown[]) => unknown[]) | undefined) {
		super(dependencies.length === 1 ? new SingleDependencyList(dependencies[0]!) : new MultipleDependencyList(dependencies))
	}

	toString(): string {
		return `CalcBox(${anythingToString(this.value)})`
	}

	override calculate(): T {
		const values = this.dependencyList.getDependencyValues()
		return this.calculateFn(...values)
	}

	protected override notifyOnValueChange(value: T, changeSource: BoxInternal<unknown> | UpstreamSubscriber | undefined, updateMeta: BoxUpdateMeta | undefined): void {
		const isChangeFromDependency = this.dependencyList.isDependency(changeSource)
		const isChangeRecalcOnGet = !changeSource && updateMeta?.type === "recalc_on_get"
		const canUpdateUpstream = !!this.reverseCalculateFn
		const shouldUpdateUpstream = canUpdateUpstream && !isChangeFromDependency && !isChangeRecalcOnGet

		if(shouldUpdateUpstream){
			this.updateUpstream(value)
		}

		super.notifyOnValueChange(value, changeSource, updateMeta)
	}

	private updateUpstream(newValue: T): void {
		const depValues = this.dependencyList.getDependencyValues()
		const newDepValues = this.reverseCalculateFn!(newValue, ...depValues)
		this.dependencyList.setDependencyValues(newDepValues)
	}
}