import {SingleDownstreamBox, WBoxInternal} from "src/new/internal"

export class MapBox<T, U> extends SingleDownstreamBox<T, U> {

	constructor(
		upstream: WBoxInternal<U>,
		protected readonly makeDownstreamValue: (value: U) => T,
		protected readonly makeUpstreamValue: (value: T) => U) {
		super(upstream)
		this.init()
	}

}