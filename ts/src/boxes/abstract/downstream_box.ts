import {DependencyList, FirstSubscriberHandlingBox, BoxInternal, NoValue, CalculatableBox, UpdateMeta, UpstreamSubscriber} from "src/internal"

/** DownstreamBox is a box that is derived from some other box (or several)
 * Those base boxes are called upstream; so this box is downstream box related to the upstream boxes
 *
 * Various downstream boxes can form a network of values, propagated through internal subscribers */
export abstract class DownstreamBox<T> extends FirstSubscriberHandlingBox<T> implements CalculatableBox<T> {

	/** Calculate value of this box based on its internal calculation logic */
	abstract calculate(): T

	/** A revision is a counter that is incremented each time the value of the box is changed.
	 *
	 * It is very tempting to use revision number to check if value is changed or not.
	 * However, it can go wrong when value does not change until you explicitly check.
	 * For example, consider viewBox that depends on another viewBox
	 * When there is no subscribers, upstream viewBox will never change, regardless of its own upstreams
	 * And if downstream viewbox only relying on upstream viewbox's revision number to check if it is was changed,
	 * there will be false negatives, because in this case it is required to check dependencies of upstream viewbox more thorough.
	 *
	 * And also value can change back and forth within one calculation, and revision will still be incremented;
	 * that's why if you rely on revision to check if the value changed you'll get some false-positives.
	 *
	 * You can try to use revision to prevent calls of subscribers with outdated value;
	 * hovewer, it will also have bugs related to early-drops of things that should not be dropped,
	 * in cases of array contexts (there's a test for that) and partial updates */
	revision = 0

	constructor(readonly dependencyList: DependencyList) {
		super()
	}

	/** Calculate the value, calling the calculation function, set it to this box,
	 * update dependency list and update subscriptions
	 *
	 * This value should be called as handler of internal subscription calls
	 *
	 * @param changeSourceBox the box that caused this value to be recalculated. Won't receive update about result. */
	protected calculateAndResubscribe(changeSourceBox: BoxInternal<unknown> | undefined): void {
		this.dependencyList.calculate(this, changeSourceBox)
	}

	protected notifyOnValueChange(value: T, changeSource: UpstreamSubscriber | BoxInternal<unknown> | undefined, updateMeta: UpdateMeta | undefined): void {
		this.revision++
		super.notifyOnValueChange(value, changeSource, updateMeta)
	}

	onUpstreamChange(upstream: BoxInternal<unknown>): void {
		this.calculateAndResubscribe(upstream)
	}

	protected shouldRecalculate(): boolean {
		if(this.value === NoValue){
			// we should never show absent value to outside world
			// also NoValue = disposed, and being disposed means that next recalculation will throw
			// and that's a good thing, because it will notify user of error in his code
			return true
		}

		if(this.haveSubscribers()){
			// if we have subscribers - we are subscribed to our dependencies
			// that means we recalculate each time a dependency is changed
			// and that means our value is up-to-date and we don't need to recalculate
			// (if we just had first subscriber - we maybe should recalculate, because we didn't have a subscriber before and didn't recalculate since then)
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
			this.calculateAndResubscribe(undefined)
		}

		return super.get()
	}

	protected override onFirstSubscriber(): void {
		this.dependencyList.subscribeToDependencies(this)
		if(this.shouldRecalculate()){
			// something may change while we wasn't subscribed to our dependencies
			// that's why we should recalculate - so our value is actual
			this.calculateAndResubscribe(undefined)
		}
	}

	protected override onLastUnsubscriber(): void {
		this.dependencyList.unsubscribeFromDependencies(this)
	}

}