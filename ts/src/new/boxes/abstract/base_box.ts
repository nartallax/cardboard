import type {ChangeHandler, RBox, RBoxInternal, UpstreamSubscriber, WBox, WBoxInternal} from "src/new/internal"
import {ArrayContextImpl, MapBox, PropRBox, PropWBox, ViewBox, isWBox, notificationStack} from "src/new/internal"
import {SubscriberList} from "src/new/subscriber_list"

export const DisposedValue = Symbol("DisposedBoxValue")

export abstract class BaseBox<T> implements WBox<T>, WBoxInternal<T> {
	/** Must be set right after construction
	 * It takes much more trouble to set this value in constructor than set it later
	 * (i.e. you cannot call methods before you have value, but to get value you need to call a method) */
	// TODO: think about makind DisposedValue be default value for cases like viewboxes, or maybe everything
	value!: T | typeof DisposedValue
	private readonly subscriberList = new SubscriberList<T, this>(this)

	haveSubscribers(): boolean {
		return this.subscriberList.haveSubscribers()
	}

	/** Update the value of the box, calling the subscribers.
	 *
	 * @param changeSourceBox the box that caused the change. Won't be notified of the change happening. */
	set(newValue: T, changeSourceBox?: RBoxInternal<unknown>): void {
		if(this.value === newValue){
			return
		}

		this.value = newValue
		this.notifyOnValueChange(newValue, changeSourceBox)
	}

	get(): T {
		notificationStack.notify(this, this.value)
		if(this.value === DisposedValue){
			throw new Error("This box is disposed; no value can be get")
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
		this.value = DisposedValue
		this.subscriberList.dispose()
	}

	subscribe(handler: ChangeHandler<T, this>): void {
		this.subscriberList.subscribe(handler, this.value)
	}

	subscribeInternal(box: UpstreamSubscriber): void {
		this.subscriberList.subscribeInternal(box, this.value)
	}

	unsubscribe(handler: ChangeHandler<T, this>): void {
		this.subscriberList.unsubscribe(handler)
	}

	unsubscribeInternal(box: UpstreamSubscriber): void {
		this.subscriberList.unsubscribeInternal(box)
	}

	protected notifyOnValueChange(value: T, changeSourceBox?: RBoxInternal<unknown>): boolean {
		return this.subscriberList.callSubscribers(value, changeSourceBox)
	}

	map<R>(mapper: (value: T) => R): RBox<R>
	map<R>(mapper: (value: T) => R, reverseMapper: (value: R) => T): WBox<R>
	map<R>(mapper: (value: T) => R, reverseMapper?: (value: R) => T): RBox<R> {
		if(!reverseMapper){
			// TODO: subclass this? to avoid new function
			return new ViewBox(() => mapper(this.get()), [this])
		}
		return new MapBox(this, mapper, reverseMapper)
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

}

const getIndex = (_: any, index: number) => index