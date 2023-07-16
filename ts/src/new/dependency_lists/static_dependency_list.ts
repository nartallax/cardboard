import {BaseMapDependencyList, DependencyList, RBoxInternal} from "src/new/internal"

export class StaticDependencyList extends BaseMapDependencyList implements DependencyList {
	readonly isStatic!: boolean

	constructor(boxes: readonly RBoxInternal<unknown>[], onDependencyUpdate: (value: unknown) => void) {
		super(onDependencyUpdate)
		for(const box of boxes){
			this.boxes.set(box, box.get())
		}
	}

	reset(): void {
		for(const box of this.boxes.keys()){
			this.boxes.set(box, box.get())
		}
	}

	notifyDependencyCall(): void {
		throw new Error("This function is not supposed to be called ever")
	}

}

// TODO: this should be a decorator, but Parcel doesn't support them at the moment
// https://github.com/parcel-bundler/parcel/issues/7425
(StaticDependencyList.prototype as any).isStatic = true
