import {anythingToString, SingleDownstreamBox, BoxInternal} from "src/internal"

export abstract class MapBox<T, U> extends SingleDownstreamBox<T, U> {

	constructor(
		upstream: BoxInternal<U>,
		protected readonly makeDownstreamValue: (value: U) => T,
		protected readonly makeUpstreamValue: (value: T) => U) {
		super(upstream)
	}

	toString(): string {
		return `${this.name ?? "MapBox"}(${anythingToString(this.value)})`
	}

	protected updateUpstreamWith(downstreamValue: T): void {
		this.upstream.set(this.makeUpstreamValue(downstreamValue), this)
	}

}

export class MapRBox<T, U> extends MapBox<T, U> {}
export class MapWBox<T, U> extends MapBox<T, U> {}