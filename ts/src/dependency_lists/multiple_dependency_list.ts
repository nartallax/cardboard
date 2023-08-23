import {BaseDependencyList, DependencyList, BoxInternal, UpstreamSubscriber, isRBox, unbox} from "src/internal"

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

}