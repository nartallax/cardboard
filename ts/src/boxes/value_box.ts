import {anythingToString, BaseBox, WBox} from "src/internal"

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
		return `${this.name ?? "ValueBox"}(${anythingToString(this.value)})`
	}
}