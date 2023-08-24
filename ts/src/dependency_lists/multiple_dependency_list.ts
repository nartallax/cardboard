import {BaseDependencyList, DependencyList, BoxInternal, UpstreamSubscriber, isRBox, unbox, isWBox, RBox} from "src/internal"

export class MultipleDependencyList extends BaseDependencyList implements DependencyList {
	private readonly boxMap: Map<BoxInternal<unknown>, unknown> = new Map()

	constructor(private readonly rawDependencies: readonly (unknown | BoxInternal<unknown>)[]) {
		super()
		for(const mbbox of rawDependencies){
			if(isRBox(mbbox)){
				this.boxMap.set(mbbox as BoxInternal<unknown>, mbbox.get())
			}
		}
	}

	protected updateKnownDependencies(): void {
		for(const box of this.boxMap.keys()){
			this.boxMap.set(box, box.get())
		}
	}

	getDependencyValues(): unknown[] {
		const result: unknown[] = new Array(this.rawDependencies.length)
		for(let i = 0; i < this.rawDependencies.length; i++){
			result[i] = unbox(this.rawDependencies[i])
		}
		return result
	}

	subscribeToDependencies(owner: UpstreamSubscriber): void {
		for(const dependency of this.boxMap.keys()){
			dependency.subscribe(owner)
		}
	}

	unsubscribeFromDependencies(owner: UpstreamSubscriber): void {
		for(const dependency of this.boxMap.keys()){
			dependency.unsubscribe(owner)
		}
	}

	didDependencyListChange(): boolean {
		for(const [box, value] of this.boxMap){
			if(box.get() !== value){
				return true
			}
		}

		return false
	}

	setDependencyValues(values: unknown[]): void {
		for(let i = 0; i < this.rawDependencies.length; i++){
			const dep = this.rawDependencies[i]!
			const value = values[i]!
			if(isWBox(dep)){
				dep.set(value)
			} else {
				const currentValue = unbox(dep)
				if(currentValue !== value){
					throw new Error("Cannot update value of readonly dependency " + dep)
				}
			}
		}
	}

	isDependency(box: RBox<unknown>): boolean {
		return this.boxMap.has(box as BoxInternal<unknown>)
	}

}