import {CalcBox, anythingToString, Subscription, BoxUpdateMeta, MapBox} from "src/internal"

/** Update is a single act of notifying a subscriber about change
 *
 * This class holds information about one update, to be executed when the time is right. */
export class Update<T> {
	constructor(
		readonly subscription: Subscription<T>,
		readonly value: T,
		public meta: BoxUpdateMeta | undefined
	) {
		if(subscription.receiver instanceof CalcBox || subscription.receiver instanceof MapBox){
			/** We deliver updates to those boxes with the flag to enforce proper recalculation order;
			 * if we deliver updates in order of receiving, there could be situation when some calcBox gets update before its upstream
			 * and therefore should be recalculated again later;
			 * also it can be confusing to user, because inconsistent state could be observed then */
			subscription.receiver.forcedShouldRecalculate = true
		}
		// console.log("created " + this)
	}

	deliver(): void {
		// console.log("delivering " + this)
		this.subscription.lastKnownValue = this.value
		const receiver = this.subscription.receiver
		if(receiver instanceof CalcBox || receiver instanceof MapBox){
			if(receiver.forcedShouldRecalculate){
				// it could be called before us, if there are other boxes depending on this calcbox
				receiver.recalculateIfShould(this.subscription.provider, this.meta)
			}
		} else if(typeof(receiver) === "function"){
			receiver(this.value, this.subscription.provider, this.meta)
		} else {
			receiver.onUpstreamChange(this.subscription.provider, this.meta)
		}
	}

	toString(): string {
		return `Update(${anythingToString(this.value)}, from ${this.subscription.provider} to ${this.subscription.receiver}${!this.meta ? "" : ", " + JSON.stringify(this.meta)})`
	}
}