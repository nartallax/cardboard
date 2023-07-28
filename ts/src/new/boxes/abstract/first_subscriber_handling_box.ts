import {BaseBox, ChangeHandler, UpstreamSubscriber} from "src/new/internal"

/** A box that invokes its handlers on first subscriber subscribing/last subscriber unsubscribing */
export abstract class FirstSubscriberHandlingBox<T> extends BaseBox<T> {
	protected abstract onFirstSubscriber(): void
	protected abstract onLastUnsubscriber(): void

	override subscribe(handler: ChangeHandler<T, this>): void {
		const hadSubs = this.haveSubscribers()
		super.subscribe(handler)
		if(!hadSubs){
			this.onFirstSubscriber()
		}
	}

	override subscribeInternal(box: UpstreamSubscriber): void {
		const hadSubs = this.haveSubscribers()
		super.subscribeInternal(box)
		if(!hadSubs){
			this.onFirstSubscriber()
		}
	}

	override unsubscribe(handler: ChangeHandler<T, this>): void {
		const hadSubs = this.haveSubscribers()
		super.unsubscribe(handler)
		// hadSubs check here because we could already have none subscribers
		// and we shouldn't invoke handler in this case
		// this is, of course, an user error, but we don't check for that
		if(hadSubs && !this.haveSubscribers()){
			this.onLastUnsubscriber()
		}
	}

	override unsubscribeInternal(box: UpstreamSubscriber): void {
		const hadSubs = this.haveSubscribers()
		super.unsubscribeInternal(box)
		if(hadSubs && !this.haveSubscribers()){
			this.onLastUnsubscriber()
		}
	}
}