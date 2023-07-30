import {anythingToString, ArrayContextImpl, NoValue, FirstSubscriberHandlingBox, BoxInternal, UpstreamSubscriber} from "src/internal"

/** A box that contains an array item
 * This box is managed by array context */
export abstract class ArrayItemBox<T, K> extends FirstSubscriberHandlingBox<T> {

	constructor(private readonly arrayContext: ArrayContextImpl<T, any>, value: T, public index: number, public key: K) {
		super()
		this.value = value
	}

	toString(): string {
		return `ArrayItemBox(${anythingToString(this.value)})`
	}

	dispose(): void {
		if(this.haveSubscribers()){
			this.arrayContext.onDownstreamUnsubscription()
		}
		super.dispose()
	}

	protected onFirstSubscriber(): void {
		if(this.value !== NoValue){
			this.arrayContext.onDownstreamSubscription()
		}
	}

	protected onLastUnsubscriber(): void {
		if(this.value !== NoValue){
			this.arrayContext.onDownstreamUnsubscription()
		}
	}

	private checkIfStillAttached(): void {
		if(!this.arrayContext.isItemBoxAttached(this)){
			throw new Error("This array item box (key = " + this.key + ") is no longer attached to its upstream. Element it was attached to was removed from upstream, or was absent in some time in the past.")
		}
	}

	override set(newValue: T, changeSourceBox?: BoxInternal<unknown>): void {
		this.checkIfStillAttached()
		super.set(newValue, changeSourceBox)
	}

	override get(): T {
		if(this.arrayContext.isItemBoxAttached(this)){
			this.arrayContext.tryUpdate()
		}
		this.checkIfStillAttached()
		return super.get()
	}

	protected notifyOnValueChange(value: T, changeSource?: BoxInternal<unknown> | UpstreamSubscriber): boolean {
		if(!super.notifyOnValueChange(value, changeSource) || changeSource === this.arrayContext.upstream){
			return false
		}

		this.arrayContext.onDownstreamChange(this, this.getExistingValue())
		return true
	}

}

export class ArrayItemRBox<T, K> extends ArrayItemBox<T, K> {}
export class ArrayItemWBox<T, K> extends ArrayItemBox<T, K> {}