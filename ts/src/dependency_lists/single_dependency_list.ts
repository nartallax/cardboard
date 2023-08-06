import {DependencyList, BoxInternal, UpstreamSubscriber, CalculatableBox, notificationStack} from "src/internal"

/** A dependency list for cases when you have only one dependency
 *
 * Optimisation for StaticDependencyList that avoids creating a map */
export class SingleDependencyList<T> implements DependencyList {
	private lastKnownDependencyValue: T

	constructor(
		private readonly dependency: BoxInternal<T>) {
		this.lastKnownDependencyValue = dependency.get()
	}

	subscribeToDependencies(owner: UpstreamSubscriber): void {
		this.dependency.subscribe(owner)
	}

	unsubscribeFromDependencies(owner: UpstreamSubscriber): void {
		this.dependency.unsubscribe(owner)
	}

	didDependencyListChange(): boolean {
		return this.lastKnownDependencyValue !== this.dependency.get()
	}

	calculate<T>(owner: CalculatableBox<T>, changeSourceBox?: BoxInternal<unknown>): void {
		const startingRevision = owner.revision
		const value = notificationStack.calculateWithoutNoticiations(owner)
		if(owner.revision === startingRevision){
			owner.set(value, changeSourceBox)
		}
		// it's not great that we're doing this
		// because each recalc we call .get() at least two times, maybe three, if we are not subscribed to
		// but, if we have a subscription, it's not that bad, because that also means our upstream have subscription
		// and will short-circuit to just give existing value
		// it becomes really bad without subscription, but I don't want to complicate code even further for such rare case
		this.lastKnownDependencyValue = this.dependency.get()
	}

}