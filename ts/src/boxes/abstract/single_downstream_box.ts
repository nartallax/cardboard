import {DownstreamBox, BoxInternal, SingleDependencyList, UpstreamSubscriber, BoxUpdateMeta} from "src/internal"

/** A downstream box that has only one upstream */
export abstract class SingleDownstreamBox<T, U> extends DownstreamBox<T> {

	protected abstract makeDownstreamValue(upstreamValue: U, meta: BoxUpdateMeta | undefined): {result: T, meta: BoxUpdateMeta | undefined}
	protected abstract updateUpstreamWith(downstreamValue: T, meta: BoxUpdateMeta | undefined): void

	constructor(protected readonly upstream: BoxInternal<U>) {
		super(new SingleDependencyList(upstream))
	}

	override calculate(_: BoxInternal<unknown> | undefined, meta: BoxUpdateMeta | undefined): {result: T, meta: BoxUpdateMeta | undefined} {
		return this.makeDownstreamValue(this.upstream.get(), meta)
	}

	protected override notifyOnValueChange(value: T, changeSource: BoxInternal<unknown> | UpstreamSubscriber | undefined, updateMeta: BoxUpdateMeta | undefined): void {
		if(changeSource !== this.upstream){
			this.updateUpstreamWith(value, updateMeta)
		}
		super.notifyOnValueChange(value, changeSource, updateMeta)
	}

	protected override calculateAndUpdate(changeSourceBox: BoxInternal<unknown> | undefined, meta: BoxUpdateMeta | undefined): void {
		if(!changeSourceBox){
			// the only case when we don't have a source box and need to recalculate
			// is when we detect that our value is out of date and needs to be updated
			// and this way our update is triggered by upstream box, in a way, because it was changed
			// we kinda should do it in DownstreamBox, but we cannot, because of its more dynamic nature
			// (that's one of the reasons why only box that can have multiple upstreams is readonly box)
			changeSourceBox = this.upstream
		}

		super.calculateAndUpdate(changeSourceBox, meta)
	}
}