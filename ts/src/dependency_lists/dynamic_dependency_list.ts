import {BaseMapDependencyList, DependencyList, BoxInternal} from "src/internal"

/* FIXME: test for box that changes its value during the call
like,
viewBox(() => {
	let firstValue = myBox.get()
	// do something to change value of myBox
	let secondValue = myBox.get()
	// and here we could think about what are the implications of this
})
*/

/** A list of boxes and their values, calculated dynamically at runtime */
export class DynamicDependencyList<O> extends BaseMapDependencyList<O> implements DependencyList {
	readonly isStatic!: boolean

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
				// TODO: test for this
				throw new Error(`A box ${box} was called more than once during single calculation, and the last known value (${value}) was not the same as first one (${oldValue}); this is highly suspicious and can lead to many problems.`)
			}
		}
		this.boxes.set(box, value)
	}

}

// TODO: this should be a decorator, but Parcel doesn't support them at the moment
// https://github.com/parcel-bundler/parcel/issues/7425
(DynamicDependencyList.prototype as any).isStatic = false