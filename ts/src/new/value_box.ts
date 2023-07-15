import {BaseBox} from "src/new/base_box"
import {WBox} from "src/new/types"

/** Make new basic writable box */
export const box = <T>(value: T): WBox<T> => {
	return new ValueBox(value)
}

export class ValueBox<T> extends BaseBox<T> implements WBox<T> {

	constructor(value: T) {
		super(value)
	}

}