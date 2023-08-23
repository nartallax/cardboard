import {DependencyList, BoxInternal, UpstreamSubscriber, BaseDependencyList, unbox, isRBox} from "src/internal"

/** A dependency list for cases when you have only one dependency */
export class SingleDependencyList<T> extends BaseDependencyList implements DependencyList {
	private lastKnownDependencyValue: T

	constructor(
		private readonly dependency: T | BoxInternal<T>) {
		super()
		this.lastKnownDependencyValue = unbox(dependency)
	}

	protected updateKnownDependencies(): void {
		this.lastKnownDependencyValue = unbox(this.dependency)
	}

	subscribeToDependencies(owner: UpstreamSubscriber): void {
		if(isRBox(this.dependency)){
			this.dependency.subscribe(owner)
		}
	}

	unsubscribeFromDependencies(owner: UpstreamSubscriber): void {
		if(isRBox(this.dependency)){
			this.dependency.unsubscribe(owner)
		}
	}

	didDependencyListChange(): boolean {
		return this.lastKnownDependencyValue !== unbox(this.dependency)
	}

	getDependencyValues(): unknown[] {
		return [unbox(this.dependency)]
	}

}