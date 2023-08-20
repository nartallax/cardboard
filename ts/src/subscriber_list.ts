import {updateQueue, type BoxChangeHandler, type BoxInternal, type UpstreamSubscriber, BoxUpdateMeta, PropBox, Subscription, Update} from "src/internal"

/** Class that manages list of active subscribers to some box */
export class SubscriberList<T, O extends BoxInternal<T>> {
	private subscriptions: Map<BoxChangeHandler<T> | UpstreamSubscriber, Subscription<T>> | null = null
	// propboxes are in separate collection to avoid calling all of them if meta tells us that we can skip some
	private propBoxInternalSubscriptions: Map<unknown, Subscription<T>[]> | null = null

	constructor(private readonly owner: O) {}

	haveSubscribers(): boolean {
		return !!(this.subscriptions || this.propBoxInternalSubscriptions)
	}

	callSubscribers(value: T, changeSourceBox: BoxInternal<unknown> | UpstreamSubscriber | undefined, updateMeta: BoxUpdateMeta | undefined): void {
		this.notifyPropSubscribers(value, changeSourceBox, updateMeta)
		this.notifySubscribers(value, changeSourceBox, updateMeta)
		updateQueue.run()
	}

	private notifySubscribers(value: T, changeSourceBox?: BoxInternal<unknown> | UpstreamSubscriber, updateMeta?: BoxUpdateMeta): void {
		if(!this.subscriptions){
			return
		}

		for(const subscription of this.subscriptions.values()){
			if(subscription.receiver === changeSourceBox){
				// that box already knows what value of this box should be
				// even if there's an update already in queue - it's not a big deal
				// downstream box will get fresh value each time anyway, instead of using value from update
				subscription.lastKnownValue = value
				continue
			}
			updateQueue.enqueueUpdate(new Update(subscription, value, updateMeta))
		}
	}

	private notifyPropSubscribers(value: T, changeSourceBox: BoxInternal<unknown> | UpstreamSubscriber | undefined, updateMeta: BoxUpdateMeta | undefined): void {
		if(!this.propBoxInternalSubscriptions){
			return
		}

		if(updateMeta && updateMeta.type === "property_update"){
			const propSubscriptionArray = this.propBoxInternalSubscriptions.get(updateMeta.propName)
			if(propSubscriptionArray){
				this.notifyPropSubscriptionArray(value, propSubscriptionArray, changeSourceBox, updateMeta)
			}
			return
		}

		for(const propSubscriptionArray of this.propBoxInternalSubscriptions.values()){
			this.notifyPropSubscriptionArray(value, propSubscriptionArray, changeSourceBox, updateMeta)
		}
	}

	private notifyPropSubscriptionArray(value: T, arr: Subscription<T>[], changeSourceBox?: BoxInternal<unknown> | UpstreamSubscriber, updateMeta?: BoxUpdateMeta): void {
		for(let i = 0; i < arr.length; i++){
			const subscription = arr[i]!
			if(subscription.receiver === changeSourceBox){
				subscription.lastKnownValue = value
				continue
			}
			updateQueue.enqueueUpdate(new Update(subscription, value, updateMeta))
		}
	}

	subscribe(handler: BoxChangeHandler<T> | UpstreamSubscriber, lastKnownValue: T): void {
		const sub: Subscription<T> = {lastKnownValue, receiver: handler, provider: this.owner}
		if(handler instanceof PropBox){
			const map: typeof this.propBoxInternalSubscriptions = this.propBoxInternalSubscriptions ||= new Map()

			let arr = map.get(handler.propName)
			if(!arr){
				arr = [sub]
				map.set(handler.propName, arr)
				return
			}

			for(let i = 0; i < arr.length; i++){
				if(arr[i]!.receiver === handler){
					return
				}
			}

			arr.push(sub)
			return
		}

		const map: typeof this.subscriptions = this.subscriptions ||= new Map()
		if(map.has(handler)){
			/** It's important to avoid creating new subscription objects if there are old ones
			 * Because update queue may hold reference to old object to update lastKnownValue
			 * and if new object is created for same handler/downstream, this update will be lost, which is bad */
			return
		}
		map.set(handler, sub)
	}

	unsubscribe(handler: BoxChangeHandler<T> | UpstreamSubscriber): void {
		if(handler instanceof PropBox){
			if(!this.propBoxInternalSubscriptions){
				return
			}

			let arr = this.propBoxInternalSubscriptions.get(handler.propName)
			if(!arr){
				return
			}

			let sub: Subscription<T> | null = null

			arr = arr.filter(x => {
				if(x.receiver === handler){
					sub = x
					return false
				}
				return true
			})

			if(sub){
				updateQueue.deleteUpdate(sub)
			}

			if(arr.length === 0){
				this.propBoxInternalSubscriptions.delete(handler.propName)
				if(this.propBoxInternalSubscriptions.size === 0){
					this.propBoxInternalSubscriptions = null
				}
			} else {
				this.propBoxInternalSubscriptions.set(handler.propName, arr)
			}
		}

		if(!this.subscriptions){
			return
		}

		this.subscriptions.delete(handler)
		if(this.subscriptions.size === 0){
			this.subscriptions = null
		}
	}

	dispose(): void {
		if(this.subscriptions){
			for(const downstream of this.subscriptions.keys()){
				if(typeof(downstream) !== "function"){
					downstream.dispose()
				}
			}
		}
	}

}