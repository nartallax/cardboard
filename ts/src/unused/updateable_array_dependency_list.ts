// import {ArrayDownstreamBox, DependencyList, WBoxInternal} from "src/new/internal"

// export class UpdateableArrayDependencyList<E> implements DependencyList<E> {
// 	// TODO: we have only one dynamic list anyway, let's ditch this property alltogether?
// 	readonly isStatic!: boolean

// 	private boxValues: E[]
// 	private subscribed = false

// 	constructor(private readonly ownerBox: ArrayDownstreamBox<E>, public boxes: readonly WBoxInternal<E>[]) {
// 		this.boxValues = boxes.map(box => box.get())
// 	}

// 	notifyDependencyCall<T extends E>(box: WBoxInternal<T>, value: T): void {
// 		throw new Error("Should never be invoked")
// 	}

// 	didDependencyListChange(): boolean {
// 		for(let i = 0; i < this.boxes.length; i++){
// 			if(this.boxValues[i] !== this.boxes[i]!.get()){
// 				return true
// 			}
// 		}
// 		return false
// 	}

// 	reset(): void {
// 		for(let i = 0; i < this.boxes.length; i++){
// 			this.boxValues[i] = this.boxes[i]!.get()
// 		}
// 	}

// 	updateDependencies(newDependenices: readonly WBoxInternal<E>[]): void {
// 		// TODO: get diff and only subscribe to new boxes if needed
// 		const wasSubscribed = this.subscribed
// 		if(wasSubscribed){
// 			this.unsubscribeFromDependencies()
// 		}

// 		this.boxes = newDependenices
// 		this.boxValues.length = 0

// 		if(wasSubscribed){
// 			this.subscribeToDependencies()
// 		}
// 	}

// 	storeKnownUpstreamValue(index: number, value: E): void {
// 		this.boxValues[index] = value
// 	}

// 	unsubscribeFromDependencies(): void {
// 		this.subscribed = false
// 		for(let i = 0; i < this.boxes.length; i++){
// 			this.boxes[i]!.unsubscribeInternal(this.ownerBox)
// 		}
// 	}

// 	subscribeToDependencies(): void {
// 		this.subscribed = true
// 		for(let i = 0; i < this.boxes.length; i++){
// 			this.boxes[i]!.subscribeInternal(this.ownerBox)
// 		}
// 	}
// }

// // TODO: this should be a decorator, but Parcel doesn't support them at the moment
// // https://github.com/parcel-bundler/parcel/issues/7425
// (UpdateableArrayDependencyList.prototype as any).isStatic = true
