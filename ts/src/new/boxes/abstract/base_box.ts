import type {ChangeHandler, RBox, RBoxInternal, Subscriber, UpstreamSubscriber, WBox, WBoxInternal} from "src/new/internal"
import {ArrayContextImpl, MapBox, PropRBox, PropWBox, ViewBox, isWBox, notificationStack} from "src/new/internal"

export const DisposedValue = Symbol("DisposedBoxValue")

export abstract class BaseBox<T> implements WBox<T>, WBoxInternal<T> {
	private subscriptions: Map<ChangeHandler<T, this>, Subscriber<T>> | null = null
	private internalSubscriptions: Map<UpstreamSubscriber, Subscriber<T>> | null = null
	/** A revision is a counter that is incremented each time the value of the box is changed
	 *
	 * This value must never be visible outside of this box.
	 * It can only be used to prevent repeated calls of subscribers.
	 *
	 * It is very tempting to use revision number to check if value is changed or not
	 * However, it can go wrong when value does not change until you explicitly check
	 * For example, consider viewBox that depends on viewBox
	 * When there is no subscribers, first viewBox will never change, regardless of its sources
	 * And if you're only relying on revision number to check if it is changed, you'll be wrong
	 *
	 * And also value can change back and forth within one calculation, and revision will still be incremented;
	 * that's why if you rely on revision to check if the value changed you'll get some false-positives */
	private revision = 1

	/** Must be set right after construction
	 * It takes much more trouble to set this value in constructor than set it later
	 * (i.e. you cannot call methods before you have value, but to get value you need to call a method) */
	// TODO: think about makind DisposedValue be default value for cases like viewboxes, or maybe everything
	value!: T | typeof DisposedValue

	haveSubscribers(): boolean {
		return !!(this.subscriptions || this.internalSubscriptions)
	}

	/** Update the value of the box, calling the subscribers.
	 *
	 * @param changeSourceBox the box that caused the change. Won't be notified of the change happening. */
	set(newValue: T, changeSourceBox?: RBoxInternal<unknown>): void {
		if(this.value === newValue){
			return
		}

		this.revision++
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
		if(this.internalSubscriptions){
			for(const downstream of this.internalSubscriptions.keys()){
				downstream.dispose()
			}
		}
	}

	subscribe(handler: ChangeHandler<T, this>): void {
		(this.subscriptions ||= new Map()).set(handler, {lastKnownValue: this.value})
	}

	subscribeInternal(box: UpstreamSubscriber): void {
		(this.internalSubscriptions ||= new Map()).set(box, {lastKnownValue: this.value})
	}

	unsubscribe(handler: ChangeHandler<T, this>): void {
		if(!this.subscriptions){
			return
		}

		this.subscriptions.delete(handler)
		if(this.subscriptions.size === 0){
			this.subscriptions = null
		}
	}

	unsubscribeInternal(box: UpstreamSubscriber): void {
		if(!this.internalSubscriptions){
			return
		}

		this.internalSubscriptions.delete(box)
		if(this.internalSubscriptions.size === 0){
			this.internalSubscriptions = null
		}
	}

	protected notifyOnValueChange(value: T, changeSourceBox?: RBoxInternal<unknown>): boolean {
		const startingRevision = this.revision

		if(this.internalSubscriptions){
			for(const [box, subscriber] of this.internalSubscriptions){
				// FIXME: cringe. think about better typing all this stuff. maybe throwing away some abstractness?
				if(box as unknown === changeSourceBox){
					// that box already knows what value of this box should be
					subscriber.lastKnownValue = value
					continue
				}
				if(subscriber.lastKnownValue !== value){
					subscriber.lastKnownValue = value
					box.onUpstreamChange(this)
				}
				if(this.revision !== startingRevision){
					// some of the subscribers changed value of the box;
					// it doesn't make sense to proceed further in this round of calls,
					// because there is another round of calls probably in progress, or maybe even already completed
					return false
				}
			}
		}

		if(this.subscriptions){
			for(const [handler, subscriber] of this.subscriptions){
				if(subscriber.lastKnownValue !== value){
					subscriber.lastKnownValue = value
					handler(value, this)
				}
				if(this.revision !== startingRevision){
					return false
				}
			}
		}

		return true
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