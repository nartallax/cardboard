import {anythingToString} from "src/common"
import {SingleDownstreamBox, BoxInternal} from "src/new/internal"

export class MapBox<T, U> extends SingleDownstreamBox<T, U> {

	constructor(
		upstream: BoxInternal<U>,
		protected readonly makeDownstreamValue: (value: U) => T,
		protected readonly makeUpstreamValue: (value: T) => U) {
		super(upstream)
		this.init()
	}

	toString(): string {
		return `MapBox(${anythingToString(this.value)})`
	}

}