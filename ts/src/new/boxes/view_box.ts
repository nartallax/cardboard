import {SingleDependencyList} from "src/new/dependency_lists/single_dependency_list"
import {BaseBox, notificationStack, DependencyList, DynamicDependencyList, StaticDependencyList, ChangeHandler, RBox, RBoxInternal} from "src/new/internal"

/** Make new view box, readonly box that calculates its value based on passed function */
export const viewBox = <T>(calcFunction: () => T, explicitDependencyList?: readonly RBox<unknown>[]): RBox<T> => {
	return new ViewBox(calcFunction, explicitDependencyList as readonly RBoxInternal<unknown>[])
}

export class ViewBox<T> extends BaseBox<T> {

	private readonly dependencyList: DependencyList

	constructor(private readonly calcFunction: () => T, explicitDependencyList?: readonly RBoxInternal<unknown>[]) {
		const onDependencyUpdate = (_: unknown, box: RBox<unknown>) => this.recalculate(box)
		const depList = explicitDependencyList
			? explicitDependencyList.length === 1
				? new SingleDependencyList(explicitDependencyList[0]!, onDependencyUpdate)
				: new StaticDependencyList(explicitDependencyList, onDependencyUpdate)
			: new DynamicDependencyList(onDependencyUpdate)
		const initialValue = notificationStack.withNotifications(depList, calcFunction)
		super(initialValue)
		depList.ownerBox = this
		this.dependencyList = depList
	}

	/** Recalculate the value, calling the calculation function, and set it to this box
	 *
	 * @param box the box that caused this value to be recalculated. Won't receive update about result. */
	private recalculate(box?: RBoxInternal<unknown>, justHadFirstSubscriber?: boolean): void {
		const shouldResubscribe = !this.dependencyList.isStatic && this.haveSubscribers()
		if(!justHadFirstSubscriber && shouldResubscribe){
			this.dependencyList.unsubscribeFromDependencies()
		}

		this.dependencyList.reset()
		const newValue = notificationStack.withNotifications(this.dependencyList, this.calcFunction)
		this.set(newValue, box)

		if(shouldResubscribe){
			this.dependencyList.subscribeToDependencies()
		}
	}

	private shouldRecalculate(justHadFirstSubscriber?: boolean): boolean {
		if(!justHadFirstSubscriber && this.haveSubscribers()){
			// if we have subscribers - we are subscribed to our dependencies
			// that means we recalculate each time a dependency is changed
			// and that means our value is up-to-date and we don't need to recalculate
			return false
		}

		// this is a little bit bad, because if we have a big "network" of viewboxes noone subscribed to,
		// then each .get() to viewbox will trigger a chain checks for each box in network
		// which could happen on first render of an app UI, for example
		// nothing really can be done with it without introducing "non-update" bugs
		if(!this.dependencyList.didDependencyListChange()){
			return false
		}

		return true
	}

	get(): T {
		if(this.shouldRecalculate()){
			this.recalculate()
		}

		return super.get()
	}

	subscribe(handler: ChangeHandler<T, this>, box?: RBoxInternal<unknown>): void {
		const hadSubs = this.haveSubscribers()
		super.subscribe(handler, box)

		if(!hadSubs){
			if(this.shouldRecalculate(true)){
				// something may change while we wasn't subscribed to our dependencies
				// that's why we should recalculate - so our value is actual
				this.recalculate(undefined, true)
			} else {
				// even if we don't recalculate - we must subscribe to dependencies
				// (if we recalculate - it will subscribe anyway)
				this.dependencyList.subscribeToDependencies()
			}
		}
	}

	unsubscribe(handler: ChangeHandler<T, this>, box?: RBoxInternal<unknown>): void {
		super.unsubscribe(handler, box)

		if(!this.haveSubscribers()){
			this.dependencyList.unsubscribeFromDependencies()
		}
	}

}