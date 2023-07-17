import {BaseBox, notificationStack, DependencyList, ChangeHandler, RBoxInternal} from "src/new/internal"

/** MapBox is a box that is derived from some other box (or several) */
export abstract class MapBox<T> extends BaseBox<T> {

	/** Calculate value of this box based on its internal calculation logic */
	protected abstract calculate(): T

	constructor(private readonly dependencyList: DependencyList, initialValue: T) {
		super(initialValue)
		this.dependencyList.ownerBox = this
	}

	// FIXME: private
	/** Calculate the value, calling the calculation function, set it to this box,
	 * update dependency list and update subscriptions
	 *
	 * @param changeSourceBox the box that caused this value to be recalculated. Won't receive update about result. */
	protected calculateAndResubscribe(changeSourceBox?: RBoxInternal<unknown>, justHadFirstSubscriber?: boolean): void {
		const shouldResubscribe = !this.dependencyList.isStatic && this.haveSubscribers()
		if(!justHadFirstSubscriber && shouldResubscribe){
			this.dependencyList.unsubscribeFromDependencies()
		}

		this.dependencyList.reset()
		// TODO: don't create function here, use method
		const newValue = notificationStack.withNotifications(this.dependencyList, () => this.calculate())
		this.set(newValue, changeSourceBox)

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
			this.calculateAndResubscribe()
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
				this.calculateAndResubscribe(undefined, true)
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