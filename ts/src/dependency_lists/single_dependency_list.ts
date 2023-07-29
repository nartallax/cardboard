import {DependencyList, DownstreamBox, BoxInternal} from "src/internal"

/** A dependency list for cases when you have only one dependency
 *
 * Optimisation for StaticDependencyList that avoids creating a map */
export class SingleDependencyList<O, T> implements DependencyList {
	readonly isStatic!: boolean

	private lastKnownDependencyValue: T

	constructor(
		private readonly ownerBox: DownstreamBox<O>,
		private readonly dependency: BoxInternal<T>) {
		this.lastKnownDependencyValue = dependency.get()
	}

	subscribeToDependencies(): void {
		this.dependency.subscribeInternal(this.ownerBox)
	}

	unsubscribeFromDependencies(): void {
		this.dependency.unsubscribeInternal(this.ownerBox)
	}

	didDependencyListChange(): boolean {
		return this.lastKnownDependencyValue !== this.dependency.get()
	}

	reset(): void {
		this.lastKnownDependencyValue = this.dependency.get()
	}

	notifyDependencyCall(): void {
		throw new Error("This method was never meant to be called")
	}

}

// TODO: this should be a decorator, but Parcel doesn't support them at the moment
// https://github.com/parcel-bundler/parcel/issues/7425
(SingleDependencyList.prototype as any).isStatic = true
