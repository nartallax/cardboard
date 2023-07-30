import {BaseMapDependencyList, DependencyList, BoxInternal} from "src/internal"

export class StaticDependencyList extends BaseMapDependencyList implements DependencyList {
	constructor(boxes: readonly BoxInternal<unknown>[]) {
		super()
		for(const box of boxes){
			this.boxes.set(box, box.get())
		}
	}

	reset(): void {
		for(const box of this.boxes.keys()){
			this.boxes.set(box, box.get())
		}
	}

}