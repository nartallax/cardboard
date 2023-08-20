import {anythingToString, SingleDownstreamBox, BoxInternal} from "src/internal"

export abstract class PropBox<U, K extends keyof U> extends SingleDownstreamBox<U[K], U> {

	constructor(
		upstream: BoxInternal<U>,
		readonly propName: K
	) {
		super(upstream)
	}

	toString(): string {
		return `${this.name ?? "PropBox"}(${anythingToString(this.value)})`
	}

	protected override makeDownstreamValue(upstreamValue: U): U[K] {
		return upstreamValue[this.propName]
	}

	protected override updateUpstreamWith(downstreamValue: U[K]): void {
		const value: U = {
			...this.upstream.get(),
			[this.propName]: downstreamValue
		}
		this.upstream.set(value, this, {type: "property_update", propName: this.propName})
	}

}

// there are two classes to distinguish between rbox and wbox in runtime
// we could always return PropWBox, as each wbox is also a rbox, but that will only protect us on type level
// that is, in such case isWBox(viewBox(() => ({a:5})).prop("a")) will be true, which is unacceptable
export class PropRBox<U, K extends keyof U> extends PropBox<U, K> {}
export class PropWBox<U, K extends keyof U> extends PropBox<U, K> {}