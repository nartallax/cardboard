import {DependencyList, BoxInternal, UpstreamSubscriber} from "src/internal"

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
		this.dependency.subscribeInternal(owner)
	}

	unsubscribeFromDependencies(owner: UpstreamSubscriber): void {
		this.dependency.unsubscribeInternal(owner)
	}

	didDependencyListChange(): boolean {
		return this.lastKnownDependencyValue !== this.dependency.get()
	}

	reset(): void {
		this.lastKnownDependencyValue = this.dependency.get()
	}

}