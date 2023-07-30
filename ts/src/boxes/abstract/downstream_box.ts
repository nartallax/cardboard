import {notificationStack, DependencyList, FirstSubscriberHandlingBox, BoxInternal, NoValue} from "src/internal"

export interface DownstreamBox<T> extends BoxInternal<T>, UpstreamSubscriber {
	calculate(): T
	readonly dependencyList: DependencyList
}

export interface UpstreamSubscriber {
	onUpstreamChange(upstream: BoxInternal<unknown>): void
	dispose(): void
}

/** DownstreamBox is a box that is derived from some other box (or several)
 *
 * Various downstream boxes can form a network of values, propagated through internal subscribers */
export abstract class DownstreamBoxImpl<T> extends FirstSubscriberHandlingBox<T> {

	/** Calculate value of this box based on its internal calculation logic */
	abstract calculate(): T

	dependencyList!: DependencyList

	/** Set all values that must be set in constructor */
	protected init(dependencyList: DependencyList): void {
		this.dependencyList = dependencyList
	}

	/** Calculate the value, calling the calculation function, set it to this box,
	 * update dependency list and update subscriptions
	 *
	 * This value should be called as handler of internal subscription calls
	 *
	 * @param changeSourceBox the box that caused this value to be recalculated. Won't receive update about result. */
	calculateAndResubscribe(changeSourceBox?: BoxInternal<unknown>, justHadFirstSubscriber?: boolean): void {
		// TODO: think about not unsubscribing from dependencies that are present after recalc
		const shouldResubscribe = !this.dependencyList.isStatic && this.haveSubscribers()
		if(!justHadFirstSubscriber && shouldResubscribe){
			this.dependencyList.unsubscribeFromDependencies()
		}

		this.dependencyList.reset()
		const newValue = notificationStack.calculateWithNotifications(this)
		this.set(newValue, changeSourceBox)

		if(shouldResubscribe){
			this.dependencyList.subscribeToDependencies()
		}
	}

	onUpstreamChange(upstream: BoxInternal<unknown>): void {
		this.calculateAndResubscribe(upstream)
	}

	protected shouldRecalculate(justHadFirstSubscriber?: boolean): boolean {
		if(this.value === NoValue){
			// we should never show disposed value to outside world
			// also NoValue = disposed, and being disposed means that next recalculation will throw
			// and that's a good thing, because it will notify user of error in his code
			return true
		}

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

	override get(): T {
		if(this.shouldRecalculate()){
			this.calculateAndResubscribe()
		}

		return super.get()
	}

	protected override onFirstSubscriber(): void {
		if(this.shouldRecalculate(true)){
			// something may change while we wasn't subscribed to our dependencies
			// that's why we should recalculate - so our value is actual
			this.calculateAndResubscribe(undefined, true)
		} else {
			// even if we don't recalculate - we must subscribe to dependencies
			// (if we recalculate - it will subscribe anyway)
			this.dependencyList.subscribeToDependencies()
		}
	}

	protected override onLastUnsubscriber(): void {
		this.dependencyList.unsubscribeFromDependencies()
	}

}