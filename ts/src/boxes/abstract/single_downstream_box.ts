import {DownstreamBoxImpl, BoxInternal, SingleDependencyList, notificationStack, UpstreamSubscriber} from "src/internal"

/** A downstream box that has only one upstream */
export abstract class SingleDownstreamBox<T, U> extends DownstreamBoxImpl<T> {

	protected abstract makeDownstreamValue(upstreamValue: U): T
	protected abstract makeUpstreamValue(downstreamValue: T): U

	protected override init(): void {
		super.init(new SingleDependencyList(this, this.upstream))
	}

	constructor(private readonly upstream: BoxInternal<U>) {
		super()
	}

	override calculate(): T {
		return this.makeDownstreamValue(this.getUpstreamValue())
	}

	protected getUpstreamValue(): U {
		return notificationStack.getWithoutNotifications(this.upstream)
	}

	protected override notifyOnValueChange(value: T, changeSourceBox?: BoxInternal<unknown> | UpstreamSubscriber, updateMeta?: unknown): boolean {
		if(!super.notifyOnValueChange(value, changeSourceBox, updateMeta) || changeSourceBox === this.upstream){
			return false
		}

		this.upstream.set(this.makeUpstreamValue(value), this)
		return true
	}

	override calculateAndResubscribe(changeSourceBox?: BoxInternal<unknown> | undefined, justHadFirstSubscriber?: boolean | undefined): void {
		if(!changeSourceBox){
			// the only case when we don't have a source box and need to recalculate
			// is when we detect that our value is out of date and needs to be updated
			// and this way our update is triggered by upstream box, in a way, because it was changed
			// we kinda should do it in DownstreamBox, but we cannot, because of its more dynamic nature
			// (that's one of the reasons why only box that can have multiple upstreams is readonly box)
			changeSourceBox = this.upstream
		}

		super.calculateAndResubscribe(changeSourceBox, justHadFirstSubscriber)
	}
}