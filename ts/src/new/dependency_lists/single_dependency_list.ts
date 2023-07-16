import {DependencyList, RBoxInternal} from "src/new/internal"

/** A dependency list for cases when you have only one dependency
 *
 * Optimisation for StaticDependencyList that avoids creating a map */
export class SingleDependencyList<T> implements DependencyList {
	readonly isStatic!: boolean

	// see ownerBox prop on base
	ownerBox!: RBoxInternal<unknown>

	private lastKnownDependencyValue: T

	constructor(
		private readonly dependency: RBoxInternal<T>,
		private readonly onDependencyUpdate: (value: unknown) => void) {
		this.lastKnownDependencyValue = dependency.get()
	}

	subscribeToDependencies(): void {
		this.dependency.subscribeInternal(this.onDependencyUpdate, this.ownerBox)
	}

	unsubscribeFromDependencies(): void {
		this.dependency.unsubscribeInternal(this.onDependencyUpdate, this.ownerBox)
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
