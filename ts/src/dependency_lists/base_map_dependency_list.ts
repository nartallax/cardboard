import type {BoxInternal, UpstreamSubscriber} from "src/internal"

/** A dependency list that stores dependencies and their values in a map */
export abstract class BaseMapDependencyList {
	protected readonly boxes: Map<BoxInternal<unknown>, unknown> = new Map()

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