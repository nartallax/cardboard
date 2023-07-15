import {BaseBox, notificationStack} from "src/new/base_box"
import {DependencyList} from "src/new/dependency_lists/dependency_list"
import {DynamicDependencyList} from "src/new/dependency_lists/dynamic_dependency_list"
import {StaticDependencyList} from "src/new/dependency_lists/static_dependency_list"
import {ChangeHandler, RBox} from "src/new/types"

/** Make new view box, readonly box that calculates its value based on passed functiion */
export const viewBox = <T>(calcFunction: () => T, explicitDependencyList?: readonly RBox<unknown>[]): RBox<T> => {
	return new ViewBox(calcFunction, explicitDependencyList)
}

export class ViewBox<T> extends BaseBox<T> {

	private readonly dependencyList: DependencyList

	constructor(private readonly calcFunction: () => T, explicitDependencyList?: readonly RBox<unknown>[]) {
		const onDependencyUpdate = () => this.recalculate()
		const depList = explicitDependencyList
			? new StaticDependencyList(explicitDependencyList, onDependencyUpdate)
			: new DynamicDependencyList(onDependencyUpdate)
		const initialValue = notificationStack.withNotifications(depList, calcFunction)
		super(initialValue)
		this.dependencyList = depList
	}

	private recalculate(justHadFirstSubscriber?: boolean): void {
		const shouldResubscribe = !this.dependencyList.isStatic && this.haveSubscribers()
		if(!justHadFirstSubscriber && shouldResubscribe){
			this.dependencyList.unsubscribeFromDependencies()
		}

		this.dependencyList.reset()
		const newValue = notificationStack.withNotifications(this.dependencyList, this.calcFunction)
		this.set(newValue)

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

	subscribe(handler: ChangeHandler<T>): void {
		const hadSubs = this.haveSubscribers()
		super.subscribe(handler)

		if(!hadSubs){
			if(this.shouldRecalculate(true)){
				// something may change when we wasn't subscribed to our dependencies
				// that's why we should recalculate - so our value is actual
				this.recalculate(true)
			} else {
				// even if we don't recalculate - we must subscribe to dependencies
				// (if we recalculate - it will subscribe anyway)
				this.dependencyList.subscribeToDependencies()
			}
		}
	}

	unsubscribe(handler: ChangeHandler<T>): void {
		super.unsubscribe(handler)

		if(!this.haveSubscribers()){
			this.dependencyList.unsubscribeFromDependencies()
		}
	}

}