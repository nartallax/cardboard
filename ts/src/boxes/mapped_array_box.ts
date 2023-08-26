import {BaseBox, anythingToString} from "src/internal"


// TODO: test for isRbox/isWBox
// a box that is result of .mapArray() call
// just a value box that is `isWbox(this) === false`
export class MappedArrayBox<T> extends BaseBox<T> {
	constructor(value: T) {
		super()
		this.value = value
	}

	toString(): string {
		return `MappedArrayBox(${anythingToString(this.value)})`
	}
}