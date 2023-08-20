import {DependencyList, BoxInternal, UpstreamSubscriber, BaseDependencyList} from "src/internal"

/** A dependency list for cases when you have only one dependency */
export class SingleDependencyList<T> extends BaseDependencyList implements DependencyList {
	private lastKnownDependencyValue: T

	constructor(
		private readonly dependency: BoxInternal<T>) {
		super()
		this.lastKnownDependencyValue = dependency.get()
	}

	protected updateKnownDependencies(): void {
		this.lastKnownDependencyValue = this.dependency.get()
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

	getDependencyValues(): unknown[] {
		return [this.dependency.get()]
	}

}