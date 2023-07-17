import {notificationStack, DynamicDependencyList, StaticDependencyList, RBox, RBoxInternal, MapBox, SingleDependencyList} from "src/new/internal"

/** Make new view box, readonly box that calculates its value based on passed function */
export const viewBox = <T>(calcFunction: () => T, explicitDependencyList?: readonly RBox<unknown>[]): RBox<T> => {
	return new ViewBox(calcFunction, explicitDependencyList as readonly RBoxInternal<unknown>[])
}

export class ViewBox<T> extends MapBox<T> {

	constructor(protected readonly calculate: () => T, explicitDependencyList?: readonly RBoxInternal<unknown>[]) {
		const onDependencyUpdate = (_: unknown, box: RBox<unknown>) => this.calculateAndResubscribe(box)
		const depList = explicitDependencyList
			? explicitDependencyList.length === 1
				? new SingleDependencyList(explicitDependencyList[0]!, onDependencyUpdate)
				: new StaticDependencyList(explicitDependencyList, onDependencyUpdate)
			: new DynamicDependencyList(onDependencyUpdate)
		const initialValue = notificationStack.withNotifications(depList, calculate)
		super(depList, initialValue)
	}

}