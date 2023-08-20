import {BaseBox, BoxChangeHandler, UpstreamSubscriber} from "src/internal"

/** A box that invokes its handlers on first subscriber subscribing/last subscriber unsubscribing */
export abstract class FirstSubscriberHandlingBox<T> extends BaseBox<T> {
	protected abstract onFirstSubscriber(): void
	protected abstract onLastUnsubscriber(): void

	override subscribe(handler: UpstreamSubscriber | BoxChangeHandler<T>): void {
		if(!this.haveSubscribers()){
			this.onFirstSubscriber()
		}
		super.subscribe(handler)
	}

	override unsubscribe(handler: UpstreamSubscriber | BoxChangeHandler<T>): void {
		const hadSubs = this.haveSubscribers()
		super.unsubscribe(handler)
		// hadSubs check here because we could already have none subscribers
		// and we shouldn't invoke handler in this case
		// this is, of course, an user error, but we don't check for that
		if(hadSubs && !this.haveSubscribers()){
			this.onLastUnsubscriber()
		}
	}

}