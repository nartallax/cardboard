import {DownstreamBox, BoxInternal, SingleDependencyList, notificationStack, UpstreamSubscriber, UpdateMeta} from "src/internal"

/** A downstream box that has only one upstream */
export abstract class SingleDownstreamBox<T, U> extends DownstreamBox<T> {

	protected abstract makeDownstreamValue(upstreamValue: U): T
	protected abstract updateUpstreamWith(downstreamValue: T): void

	constructor(protected readonly upstream: BoxInternal<U>) {
		super(new SingleDependencyList(upstream))
	}

	override calculate(): T {
		return this.makeDownstreamValue(this.getUpstreamValue())
	}

	protected getUpstreamValue(): U {
		return notificationStack.getWithoutNotifications(this.upstream)
	}

	protected override notifyOnValueChange(value: T, changeSource: BoxInternal<unknown> | UpstreamSubscriber | undefined, updateMeta: UpdateMeta | undefined): void {
		if(changeSource !== this.upstream){
			this.updateUpstreamWith(value)
		}
		super.notifyOnValueChange(value, changeSource, updateMeta)
	}

	protected override calculateAndResubscribe(isPreparingForFirstSub: boolean, changeSourceBox: BoxInternal<unknown> | undefined): void {
		if(!changeSourceBox){
			// the only case when we don't have a source box and need to recalculate
			// is when we detect that our value is out of date and needs to be updated
			// and this way our update is triggered by upstream box, in a way, because it was changed
			// we kinda should do it in DownstreamBox, but we cannot, because of its more dynamic nature
			// (that's one of the reasons why only box that can have multiple upstreams is readonly box)
			changeSourceBox = this.upstream
		}

		super.calculateAndResubscribe(isPreparingForFirstSub, changeSourceBox)
	}
}