import {anythingToString, DynamicDependencyList, StaticDependencyList, RBox, BoxInternal, DownstreamBoxImpl, SingleDependencyList} from "src/internal"

/** Make new view box, readonly box that calculates its value based on passed function */
export const viewBox = <T>(calcFunction: () => T, explicitDependencyList?: readonly RBox<unknown>[]): RBox<T> => {
	return new ViewBox(calcFunction, explicitDependencyList as undefined | readonly BoxInternal<unknown>[])
}

export class ViewBox<T> extends DownstreamBoxImpl<T> {

	constructor(readonly calculate: () => T, explicitDependencyList?: readonly BoxInternal<unknown>[]) {
		super()
		this.init(explicitDependencyList
			? explicitDependencyList.length === 1
				? new SingleDependencyList(this, explicitDependencyList[0]!)
				: new StaticDependencyList(this, explicitDependencyList)
			: new DynamicDependencyList(this))
	}

	toString(): string {
		return `ViewBox(${anythingToString(this.value)})`
	}

}