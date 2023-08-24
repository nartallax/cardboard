import {anythingToString, SingleDownstreamBox, BoxInternal, BoxUpdateMeta} from "src/internal"

export abstract class MapBox<T, U> extends SingleDownstreamBox<T, U> {

	constructor(
		upstream: BoxInternal<U>,
		protected readonly makeDownstreamValue: (value: U, meta: BoxUpdateMeta | undefined) => T,
		protected readonly makeUpstreamValue: (value: T, meta: BoxUpdateMeta | undefined) => U) {
		super(upstream)
	}

	toString(): string {
		return `MapBox(${anythingToString(this.value)})`
	}

	protected updateUpstreamWith(downstreamValue: T, meta: BoxUpdateMeta | undefined): void {
		this.upstream.set(this.makeUpstreamValue(downstreamValue, meta), this)
	}

}

export class MapRBox<T, U> extends MapBox<T, U> {}
export class MapWBox<T, U> extends MapBox<T, U> {}