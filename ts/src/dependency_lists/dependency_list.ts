import type {BoxInternal, UpstreamSubscriber} from "src/internal"

/** A list of boxes some calculation depends on  */
export interface DependencyList {
	/** Called each time right before the calculation */
	reset(): void
	/** Goes all the known dependencies and checks if any of those did change */
	didDependencyListChange(): boolean
	unsubscribeFromDependencies(owner: UpstreamSubscriber): void
	subscribeToDependencies(owner: UpstreamSubscriber): void
}

/** A dependency list that stores dependencies and their values in a map */
export abstract class BaseMapDependencyList {
	protected readonly boxes: Map<BoxInternal<unknown>, unknown> = new Map()

	subscribeToDependencies(owner: UpstreamSubscriber): void {
		for(const dependency of this.boxes.keys()){
			dependency.subscribeInternal(owner)
		}
	}

	unsubscribeFromDependencies(owner: UpstreamSubscriber): void {
		for(const dependency of this.boxes.keys()){
			dependency.unsubscribeInternal(owner)
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