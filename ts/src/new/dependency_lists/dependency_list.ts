import type {RBoxInternal} from "src/new/internal"

/** A list of boxes some calculation depends on  */
export interface DependencyList {
	/** A box this dependency list belongs to
	 *
	 * MUST be set after construction
	 * this property cannot be set in constructor because this list is often constructed in constructor of box itself */
	ownerBox: RBoxInternal<unknown>
	/** Static dependency lists can never change
	 * This sometimes can lead to optimizations */
	readonly isStatic: boolean
	notifyDependencyCall<T>(box: RBoxInternal<T>, value: T): void
	/** Called each time right before the calculation */
	reset(): void
	/** Goes all the known dependencies and checks if any of those did change */
	didDependencyListChange(): boolean
	unsubscribeFromDependencies(): void
	subscribeToDependencies(): void
}

/** A dependency list that stores dependencies and their values in a map */
export abstract class BaseMapDependencyList {
	protected readonly boxes: Map<RBoxInternal<unknown>, unknown> = new Map()

	ownerBox!: RBoxInternal<unknown>

	// TODO: maybe we don't need this function, and it can be a method?
	constructor(private readonly onDependencyUpdate: (value: unknown) => void) {}

	subscribeToDependencies(): void {
		for(const dependency of this.boxes.keys()){
			dependency.subscribeInternal(this.onDependencyUpdate, this.ownerBox)
		}
	}

	unsubscribeFromDependencies(): void {
		for(const dependency of this.boxes.keys()){
			dependency.unsubscribeInternal(this.onDependencyUpdate, this.ownerBox)
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