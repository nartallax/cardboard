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
		// TODO: optimize this away as well
		return this.lastKnownDependencyValue !== this.dependency.get()
	}

	calculate<T>(owner: CalculatableBox<T>, changeSourceBox?: BoxInternal<unknown>): void {
		const startingRevision = owner.revision
		const value = notificationStack.calculateWithoutNoticiations(owner)
		if(owner.revision === startingRevision){
			owner.set(value, changeSourceBox)
		}
		// TODO: think about NOT doing this
		// this potentially makes n^2 calculations, where n = cumulative amount of dependent boxes
		// which is very, very bad, it should be linear
		// that is, owner already .get() this box when calculating, let's not do it again
		// (same for static dependency list)
		this.lastKnownDependencyValue = this.dependency.get()
	}

}