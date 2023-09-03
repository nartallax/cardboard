import {anythingToString, ArrayContextImpl, NoValue, FirstSubscriberHandlingBox} from "src/internal"

/** Some box that is managed by array context */
export class ArrayContextControlledBox<T> extends FirstSubscriberHandlingBox<T> {

	constructor(protected readonly arrayContext: ArrayContextImpl<any, any, any>, value: T) {
		super()
		this.value = value
	}

	toString(): string {
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

	checkIfStillAttached(): void {
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