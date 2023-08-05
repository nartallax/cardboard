import {ViewBox} from "src/internal"
import {BoxInternal, Subscription} from "src/types"
import {UpdateMeta} from "src/update_delivery/update_meta"

/** Update is a single act of notifying a subscriber about change
 *
 * This class holds information about one update, to be executed when the time is right.
 */
export class Update<T> {
	constructor(
		readonly subscription: Subscription<T>,
		readonly value: T,
		readonly provider: BoxInternal<T>,
		public meta: UpdateMeta | undefined
	) {
		if(subscription.receiver instanceof ViewBox){
			/** This is all it takes to deliver update to ViewBox
			 * We don't need to deliver meta, because no ViewBox can do anything meaningful with meta
			 * We don't need to deliver provider, because ViewBox is readonly and therefore won't notify upstream of self updates
			 *
			 * And we do it with the flag to enforce proper recalculation order;
			 * if we deliver updates in order of receiving, there could be situation when some viewBox gets update before its upstream
			 * and therefore should be recalculated again later; also it can be confusing to user */
			subscription.receiver.forcedShouldRecalculate = true
		}
	}

	deliver(): void {
		this.subscription.lastKnownValue = this.value
		const receiver = this.subscription.receiver
		if(receiver instanceof ViewBox){
			if(receiver.forcedShouldRecalculate){
				receiver.get()
			}
		} else if(typeof(receiver) === "function"){
			receiver(this.value, this.provider)
		} else {
			receiver.onUpstreamChange(this.provider, this.meta)
		}
	}
}