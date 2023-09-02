import {DependencyList, BoxInternal, UpstreamSubscriber, BaseDependencyList, unbox, isRBox, isWBox, RBox} from "src/internal"

/** A dependency list for cases when you have only one dependency */
export class SingleDependencyList<T> extends BaseDependencyList implements DependencyList {
	private lastKnownDependencyValue: T

	constructor(
		readonly dependency: T | BoxInternal<T>) {
		super()
		this.lastKnownDependencyValue = unbox(dependency)
	}

	updateKnownDependencyValues(): void {
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

	setDependencyValues(values: unknown[]): void {
		if(isWBox(this.dependency)){
			this.dependency.set(values[0]! as T)
		} else {
			const currentValue = unbox(this.dependency)
			if(currentValue !== values[0]){
				throw new Error("Cannot update value of readonly dependency " + this.dependency)
			}
		}
	}

	isDependency(box: RBox<unknown>): boolean {
		return box === this.dependency
	}

}