import {anythingToString, ArrayContextImpl, NoValue, FirstSubscriberHandlingBox} from "src/internal"

// TODO: test about array mapped box of array element box; what will happen at dispose of array element box?

/** A box that contains an array item
 * This box is managed by array context */
export class ArrayContextControlledBox<T> extends FirstSubscriberHandlingBox<T> {

	constructor(protected readonly arrayContext: ArrayContextImpl<any, any, any>, value: T) {
		super()
		this.value = value
	}

	toString(): string {
		// TODO: test
		return `ArrayContextControlledBox(${anythingToString(this.value)})`
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

	protected checkIfStillAttached(): void {
		if(!this.arrayContext.isItemBoxAttached(this)){
			throw new Error("This array-linked box " + this + " is no longer attached to its upstream. Element it was attached to was removed from upstream, or was absent in some time in the past.")
		}
	}

	override get(): T {
		if(this.arrayContext.isItemBoxAttached(this)){
			this.arrayContext.tryUpdate()
		}
		this.checkIfStillAttached()
		return super.get()
	}

}