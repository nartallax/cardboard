import type {DownstreamBox, BoxInternal} from "src/new/internal"

/** A list of boxes some calculation depends on  */
export interface DependencyList<D = any> {
	/** Static dependency lists can never change
	 * This sometimes can lead to optimizations */
	readonly isStatic: boolean
	notifyDependencyCall<T extends D>(box: BoxInternal<T>, value: T): void
	/** Called each time right before the calculation */
	reset(): void
	/** Goes all the known dependencies and checks if any of those did change */
	didDependencyListChange(): boolean
	unsubscribeFromDependencies(): void
	subscribeToDependencies(): void
}

/** A dependency list that stores dependencies and their values in a map */
export abstract class BaseMapDependencyList<O> {
	protected readonly boxes: Map<BoxInternal<unknown>, unknown> = new Map()

	constructor(private readonly ownerBox: DownstreamBox<O>) {}

	subscribeToDependencies(): void {
		for(const dependency of this.boxes.keys()){
			dependency.subscribeInternal(this.ownerBox)
		}
	}

	unsubscribeFromDependencies(): void {
		for(const dependency of this.boxes.keys()){
			dependency.unsubscribeInternal(this.ownerBox)
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