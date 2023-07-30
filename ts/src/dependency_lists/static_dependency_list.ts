import {BaseMapDependencyList, DependencyList, BoxInternal, CalculatableBox, notificationStack} from "src/internal"

export class StaticDependencyList extends BaseMapDependencyList implements DependencyList {
	constructor(boxes: readonly BoxInternal<unknown>[]) {
		super()
		for(const box of boxes){
			this.boxes.set(box, box.get())
		}
	}

	calculate<T>(owner: CalculatableBox<T>, changeSourceBox?: BoxInternal<unknown>): void {
		owner.set(notificationStack.calculateWithoutNoticiations(owner), changeSourceBox)
		for(const box of this.boxes.keys()){
			this.boxes.set(box, box.get())
		}
	}

}