import type {ChangeHandler, RBox, BoxInternal, UpstreamSubscriber, WBox, UpdateMeta} from "src/internal"
import {ArrayContextImpl, MapRBox, MapWBox, PropRBox, PropWBox, isWBox, notificationStack} from "src/internal"
import {SubscriberList} from "src/subscriber_list"

export const NoValue = Symbol("AbsentBoxValue")

export abstract class BaseBox<T> implements BoxInternal<T> {
	value: T | typeof NoValue = NoValue
	private readonly subscriberList = new SubscriberList<T, this>(this)

	haveSubscribers(): boolean {
		return this.subscriberList.haveSubscribers()
	}

	/** Update the value of the box, calling the subscribers.
	 *
	 * @param changeSource the box that caused the change. Won't be notified of the change happening. */
	set(newValue: T, changeSource?: BoxInternal<unknown> | UpstreamSubscriber, updateMeta?: UpdateMeta): void {
		if(this.value === newValue){
			return
		}

		this.value = newValue
		this.notifyOnValueChange(changeSource, updateMeta)
	}

	get(): T {
		notificationStack.notify(this, this.value)
		if(this.value === NoValue){
			throw new Error("This box is disposed; no value can be get")
		}
		return this.value
	}

	/** Get the value. Recalculate only if value is absent.
	 * Result of the call should be used as subscription "initially-known" value
	 * And we shouldn't use NoValue because it doesn't make sense;
	 * of course other box didn't get NoValue value, it's never shown to outside world */
	private getForSubscription(): T {
		return this.value === NoValue ? this.get() : this.value
	}

	getExistingValue(): T {
		if(this.value === NoValue){
			throw new Error("Unexpected absence of value. Not sure how did we get here. Go report a bug.")
		}
		return this.value
	}

	/** When a box is disposed, it is no longer possible to get or set a value to this box
	 *
	 * Use case is situation when some upstream becomes invalid;
	 * that means setting or getting value of this box is an error
	 * because it is no longer updated or is able to propagate value to his own upstream
	 * in this case, every downstream box should also became invalid */
	dispose(): void {
		this.value = NoValue
		this.subscriberList.dispose()
	}

	subscribe(handler: ChangeHandler<T, this>): void {
		this.subscriberList.subscribe(handler, this.getForSubscription())
	}

	subscribeInternal(box: UpstreamSubscriber): void {
		this.subscriberList.subscribeInternal(box, this.getForSubscription())
	}

	unsubscribe(handler: ChangeHandler<T, this>): void {
		this.subscriberList.unsubscribe(handler)
	}

	unsubscribeInternal(box: UpstreamSubscriber): void {
		this.subscriberList.unsubscribeInternal(box)
	}

	protected notifyOnValueChange(changeSource?: BoxInternal<unknown> | UpstreamSubscriber, updateMeta?: UpdateMeta): boolean {
		return this.subscriberList.callSubscribers(changeSource, updateMeta)
	}

	map<R>(mapper: (value: T) => R): RBox<R>
	map<R>(mapper: (value: T) => R, reverseMapper: (value: R) => T): WBox<R>
	map<R>(mapper: (value: T) => R, reverseMapper?: (value: R) => T): RBox<R> {
		if(!reverseMapper){
			return new MapRBox(this, mapper, throwOnReverseMapping)
		} else {
			return new MapWBox(this, mapper, reverseMapper)
		}
	}

	prop<K extends keyof T>(this: RBox<T>, propName: K): RBox<T[K]>
	prop<K extends keyof T>(this: WBox<T>, propName: K): WBox<T[K]>
	prop<K extends keyof T>(propName: K): WBox<T[K]> | RBox<T[K]> {
		return isWBox(this) ? new PropWBox(this, propName) : new PropRBox(this, propName)
	}

	getArrayContext<E, K>(this: BaseBox<E[]>, getKey: (item: E, index: number) => K): ArrayContextImpl<E, K> {
		return new ArrayContextImpl(this, getKey)
	}

	mapArray<E, R>(this: WBox<E[]>, mapper: (item: E, index: number) => R): RBox<R[]>
	mapArray<E, R>(this: WBox<E[]>, mapper: (item: E, index: number) => R, reverseMapper: (item: R, index: number) => E): WBox<R[]>
	mapArray<E, R>(this: WBox<E[]>, mapper: (item: E, index: number) => R, reverseMapper?: (item: R, index: number) => E): WBox<R[]> | RBox<R[]> {
		const context = this.getArrayContext(getIndex) as ArrayContextImpl<E, number> // ew.
		if(reverseMapper){
			return context.mapArray(mapper, reverseMapper)
		} else {
			return context.mapArray(mapper)
		}
	}

	setProp<K extends keyof T>(propName: K, propValue: T[K]): void {
		const oldValue = this.get()
		if(oldValue[propName] === propValue){
			return
		}
		this.set({...oldValue, [propName]: propValue}, undefined, {type: "property_update", propName})
	}

	setElementByIndex<E>(this: BaseBox<readonly E[]>, index: number, value: E): void {
		const oldValue = this.get()
		if(oldValue[index] === value){
			return
		}
		const newValue = [...oldValue]
		newValue[index] = value
		this.set(newValue, undefined, {type: "array_item_update", index})
	}

	insertElementAtIndex<E>(this: BaseBox<readonly E[]>, index: number, value: E): void {
		const oldValue = this.get()
		const newValue = [...oldValue.slice(0, index), value, ...oldValue.slice(index)]
		this.set(newValue, undefined, {type: "array_item_insert", index})
	}

}

const getIndex = (_: any, index: number) => index
const throwOnReverseMapping = () => {
	throw new Error("This box does not support reverse-mapping")
}