// import {UpdateableArrayDependencyList, DownstreamBoxImpl, RBoxInternal, WBoxInternal} from "src/new/internal"

// // TODO: arrayBox function

// /** A box that is downstream for many other boxes */
// export class ArrayDownstreamBox<E> extends DownstreamBoxImpl<E[]> {

// 	declare dependencyList: UpdateableArrayDependencyList<E>

// 	constructor(upstreams: readonly WBoxInternal<E>[]) {
// 		super()
// 		this.init(new UpdateableArrayDependencyList(this, upstreams))
// 	}

// 	setUpstreamBoxes(upstreams: readonly WBoxInternal<E>[]): void {
// 		// TODO: I don't like that we resubscribe here two times. maybe we can avoid that..?
// 		this.dependencyList.updateDependencies(upstreams)
// 		this.calculateAndResubscribe()
// 	}

// 	protected notifyOnValueChange(value: E[], changeSourceBox?: RBoxInternal<unknown> | undefined): boolean {
// 		if(!super.notifyOnValueChange(value, changeSourceBox)){
// 			return false
// 		}
		
// 		for(let i = 0; i < value.length; i++){
// 			if(box === changeSourceBox){
// 				continue
// 			}
// 			box.set()
// 		}

// 		return true
// 	}

// 	// TODO: test that update to a single box does not update all of them
// 	override calculate(): E[] {
// 		const result: E[] = new Array(this.dependencyList.boxes.length)
// 		for(let i = 0; i < this.dependencyList.boxes.length; i++){
// 			result[i] = this.dependencyList.boxes[i]!.get()
// 		}
// 		return result
// 	}

// 	override onUpstreamChange(upstream: WBoxInternal<E>, value: E): void {
// 		const index = this.dependencyList.boxes.indexOf(upstream)
// 		this.dependencyList.storeKnownUpstreamValue(index, value)

// 		const newValue = [...this.value]
// 		newValue[index] = value
// 		this.set(newValue, upstream)
// 	}
// }