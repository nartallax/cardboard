import {anythingToString, DynamicDependencyList, StaticDependencyList, RBox, BoxInternal, DownstreamBox, SingleDependencyList} from "src/internal"

/** Make new view box, readonly box that calculates its value based on passed function */
export const viewBox = <T>(calcFunction: () => T, explicitDependencyList?: readonly RBox<unknown>[]): RBox<T> => {
	return new ViewBox(calcFunction, explicitDependencyList as undefined | readonly BoxInternal<unknown>[])
}

export class ViewBox<T> extends DownstreamBox<T> {

	constructor(readonly calculate: () => T, explicitDependencyList?: readonly BoxInternal<unknown>[]) {
		super(explicitDependencyList
			? explicitDependencyList.length === 1
				? new SingleDependencyList(explicitDependencyList[0]!)
				: new StaticDependencyList(explicitDependencyList)
			: new DynamicDependencyList())
	}

	toString(): string {
		return `ViewBox(${anythingToString(this.value)})`
	}

}