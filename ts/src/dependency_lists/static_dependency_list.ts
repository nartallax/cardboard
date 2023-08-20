import {BaseMapDependencyList, DependencyList, BoxInternal, CalculatableBox, notificationStack} from "src/internal"

// TODO: rename? it's not static vs dynamic anymore
export class StaticDependencyList extends BaseMapDependencyList implements DependencyList {
	constructor(boxes: readonly BoxInternal<unknown>[]) {
		super()
		for(const box of boxes){
			this.boxes.set(box, box.get())
		}
	}

	calculate<T>(owner: CalculatableBox<T>, changeSourceBox?: BoxInternal<unknown>): void {
		const startingRevision = owner.revision
		const value = notificationStack.calculateWithoutNoticiations(owner)
		if(owner.revision === startingRevision){
			owner.set(value, changeSourceBox)
		}

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

}