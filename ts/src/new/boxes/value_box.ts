import {anythingToString} from "src/common"
import {BaseBox, WBox} from "src/new/internal"

/** Make new basic writable box */
export const box = <T>(value: T): WBox<T> => {
	return new ValueBox(value)
}

export class ValueBox<T> extends BaseBox<T> {
	constructor(value: T) {
		super()
		this.value = value
	}

	toString(): string {
		return `ValueBox(${anythingToString(this.value)})`
	}
}