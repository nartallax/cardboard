import {anythingToString} from "src/common"
import {SingleDownstreamBox, BoxInternal} from "src/new/internal"

export abstract class PropBox<U, K extends keyof U> extends SingleDownstreamBox<U[K], U> {

	constructor(
		upstream: BoxInternal<U>,
		private readonly propName: K
	) {
		super(upstream)
		this.init()
	}

	toString(): string {
		return `PropBox(${anythingToString(this.value)})`
	}

	protected override makeDownstreamValue(upstreamValue: U): U[K] {
		return upstreamValue[this.propName]
	}

	protected override makeUpstreamValue(downstreamValue: U[K]): U {
		// TODO: check here that upstream prop value isn't the same? if it's testable
		// TODO: think about not triggering the rest of propboxes on update..?
		return {
			...this.getUpstreamValue(),
			[this.propName]: downstreamValue
		}
	}

}

// there are two classes to distinguish between rbox and wbox in runtime
// we could always return PropWBox, as each wbox is also a rbox, but that will only protect us on type level
// that is, in such case isWBox(viewBox(() => ({a:5})).prop("a")) will be true, which is unacceptable
export class PropRBox<U, K extends keyof U> extends PropBox<U, K> {}
export class PropWBox<U, K extends keyof U> extends PropBox<U, K> {}