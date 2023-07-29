import {BaseMapDependencyList, DependencyList, DownstreamBox, BoxInternal} from "src/internal"

export class StaticDependencyList<O> extends BaseMapDependencyList<O> implements DependencyList {
	readonly isStatic!: boolean

	constructor(ownerBox: DownstreamBox<O>, boxes: readonly BoxInternal<unknown>[]) {
		super(ownerBox)
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