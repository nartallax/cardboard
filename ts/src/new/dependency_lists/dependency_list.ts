import type {RBox} from "src/new/internal"

/** A list of boxes some calculation depends on  */
export interface DependencyList {
	/** Static dependency lists can never change
	 * This sometimes can lead to optimizations */
	readonly isStatic: boolean
	notifyDependencyCall<T>(box: RBox<T>, value: T): void
	/** Called each time right before the calculation */
	reset(): void
	/** Goes all the known dependencies and checks if any of those did change */
	didDependencyListChange(): boolean
	unsubscribeFromDependencies(): void
	subscribeToDependencies(): void
}

/** A dependency list that stores dependencies and their values in a map */
export abstract class BaseMapDependencyList {
	protected readonly boxes: Map<RBox<unknown>, unknown> = new Map()

	constructor(private readonly onDependencyUpdate: (value: unknown) => void) {}

	subscribeToDependencies(): void {
		for(const dependency of this.boxes.keys()){
			dependency.subscribe(this.onDependencyUpdate)
		}
	}

	unsubscribeFromDependencies(): void {
		for(const dependency of this.boxes.keys()){
			dependency.unsubscribe(this.onDependencyUpdate)
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