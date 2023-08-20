import {BaseDependencyList, DependencyList, BoxInternal, UpstreamSubscriber} from "src/internal"

export class MultipleDependencyList extends BaseDependencyList implements DependencyList {
	protected readonly boxes: Map<BoxInternal<unknown>, unknown> = new Map()

	constructor(boxes: readonly BoxInternal<unknown>[]) {
		super()
		for(const box of boxes){
			this.boxes.set(box, box.get())
		}
	}

	protected updateKnownDependencies(): void {
		for(const box of this.boxes.keys()){
			this.boxes.set(box, box.get())
		}
	}

	getDependencyValues(): unknown[] {
		const result: unknown[] = new Array(this.boxes.size)
		let i = 0
		for(const box of this.boxes.keys()){
			result[i++] = box.get()
		}
		return result
	}

	subscribeToDependencies(owner: UpstreamSubscriber): void {
		for(const dependency of this.boxes.keys()){
			dependency.subscribe(owner)
		}
	}

	unsubscribeFromDependencies(owner: UpstreamSubscriber): void {
		for(const dependency of this.boxes.keys()){
			dependency.unsubscribe(owner)
		}
	}

	didDependencyListChange(): boolean {
		for(const [box, value] of this.boxes){
			if(box.get() !== value){
				return true
			}
		}

		return false
	}

}