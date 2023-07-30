import {BaseMapDependencyList, DependencyList, BoxInternal} from "src/internal"

/** A list of boxes and their values, calculated dynamically at runtime */
export class DynamicDependencyList extends BaseMapDependencyList implements DependencyList {
	reset(): void {
		this.boxes.clear()
	}

	notifyDependencyCall<T>(box: BoxInternal<T>, value: T): void {
		if(this.boxes.has(box)){
			const oldValue = this.boxes.get(box)
			if(oldValue !== value){
				// this error mostly exists because of how we track if the box changed value since last calculation
				// (i.e. we only store one value per box)
				// so if there's more than one value per calculation - it's extremely confusing for us
				// I cannot think of how this could happen in real app, so for now this situation will throw
				throw new Error(`A box ${box} was called more than once during single calculation, and the last known value (${value}) was not the same as first one (${oldValue}); this is highly suspicious and can lead to many problems.`)
			}
		}
		this.boxes.set(box, value)
	}

}