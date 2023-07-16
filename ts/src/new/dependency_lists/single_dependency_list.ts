import {DependencyList, RBox} from "src/new/internal"

/** A dependency list for cases when you have only one dependency
 *
 * Optimisation for StaticDependencyList that avoids creating a map */
export class SingleDependencyList<T> implements DependencyList {
	readonly isStatic!: boolean

	private lastKnownDependencyValue: T

	constructor(
		private readonly dependency: RBox<T>,
		private readonly onDependencyUpdate: (value: unknown) => void) {
		this.lastKnownDependencyValue = dependency.get()
	}

	subscribeToDependencies(): void {
		this.dependency.subscribe(this.onDependencyUpdate)
	}

	unsubscribeFromDependencies(): void {
		this.dependency.unsubscribe(this.onDependencyUpdate)
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
