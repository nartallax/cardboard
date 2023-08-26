import {mapArray} from "src/array_contexts/map_array"
import type {BoxChangeHandler, RBox, BoxInternal, UpstreamSubscriber, WBox, BoxUpdateMeta} from "src/internal"
import {ArrayContextImpl, MapRBox, MapWBox, PropRBox, PropWBox, isWBox, mapArrayElements, SubscriberList} from "src/internal"

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
	set(newValue: T, changeSource?: BoxInternal<unknown> | UpstreamSubscriber, updateMeta?: BoxUpdateMeta): void {
		if(this.value === newValue){
			return
		}

		this.value = newValue
		this.notifyOnValueChange(newValue, changeSource, updateMeta)
	}

	get(): T {
		if(this.value === NoValue){
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
		this.value = NoValue
		this.subscriberList.dispose()
	}

	subscribe(handler: UpstreamSubscriber | BoxChangeHandler<T>): void {
		this.subscriberList.subscribe(handler, this.get())
	}

	unsubscribe(handler: UpstreamSubscriber | BoxChangeHandler<T>): void {
		this.subscriberList.unsubscribe(handler)
	}

	protected notifyOnValueChange(value: T, changeSource: BoxInternal<unknown> | UpstreamSubscriber | undefined, updateMeta: BoxUpdateMeta | undefined): void {
		this.subscriberList.callSubscribers(value, changeSource, updateMeta)
	}

	map<R>(mapper: (value: T, meta: BoxUpdateMeta | undefined) => R): RBox<R>
	map<R>(mapper: (value: T, meta: BoxUpdateMeta | undefined) => R, reverseMapper: (value: R, meta: BoxUpdateMeta | undefined) => T): WBox<R>
	map<R>(mapper: (value: T, meta: BoxUpdateMeta | undefined) => R, reverseMapper?: (value: R, meta: BoxUpdateMeta | undefined) => T): RBox<R> {
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

	getArrayContext<E, K>(this: BaseBox<E[]>, getKey: (item: E, index: number) => K): ArrayContextImpl<E, K, null> {
		return new ArrayContextImpl(this, getKey, getNull)
	}

	mapArrayElements<E, R>(this: BaseBox<readonly E[]>, mapper: (item: E, index: number) => R): RBox<R[]>
	mapArrayElements<E, R>(this: BaseBox<readonly E[]>, mapper: (item: E, index: number) => R, reverseMapper: (item: R, index: number) => E): WBox<R[]>
	mapArrayElements<E, R>(this: BaseBox<readonly E[]>, mapper: (item: E, index: number) => R, reverseMapper?: (item: R, index: number) => E): WBox<R[]> | RBox<R[]> {
		return mapArrayElements(this, mapper, reverseMapper)
	}

	mapArray<E, K, R>(this: BaseBox<readonly E[]>, getKey: (item: E, index: number) => K, mapBox: (box: WBox<E>, index: number) => R): RBox<readonly R[]> {
		return mapArray(this, getKey, mapBox)
	}

	setProp<K extends keyof T>(propName: K, propValue: T[K]): void {
		const oldValue = this.get()
		if(oldValue[propName] === propValue){
			return
		}
		this.set({...oldValue, [propName]: propValue}, undefined, {type: "property_update", propName})
	}

	setElementAtIndex<E>(this: BaseBox<readonly E[]>, index: number, value: E): void {
		const oldValue = this.get()
		if(oldValue[index] === value){
			return
		}
		const oldElementValue = oldValue[index]
		const newValue = [...oldValue]
		newValue[index] = value
		this.set(newValue, undefined, {type: "array_item_update", index, oldValue: oldElementValue})
	}

	insertElementsAtIndex<E>(this: BaseBox<readonly E[]>, index: number, values: readonly E[]): void {
		if(values.length === 0){
			return
		}

		const oldValue = this.get()
		this.checkInsertIndex(oldValue, index)
		const newValue = [...oldValue.slice(0, index), ...values, ...oldValue.slice(index)]
		this.set(newValue, undefined, {type: "array_items_insert", index, count: values.length})
	}

	insertElementAtIndex<E>(this: BaseBox<readonly E[]>, index: number, value: E): void {
		this.insertElementsAtIndex(index, [value])
	}

	appendElement<E>(this: WBox<readonly E[]>, value: E): void {
		this.insertElementsAtIndex(this.get().length, [value])
	}

	appendElements<E>(this: WBox<readonly E[]>, values: readonly E[]): void {
		this.insertElementsAtIndex(this.get().length, values)
	}

	prependElement<E>(this: WBox<readonly E[]>, value: E): void {
		this.insertElementsAtIndex(0, [value])
	}

	prependElements<E>(this: WBox<readonly E[]>, values: readonly E[]): void {
		this.insertElementsAtIndex(0, values)
	}

	private checkInsertIndex(elements: readonly unknown[], index: number): void {
		if(index < 0){
			throw new Error(`Cannot insert anything in negative index (passed index = ${index})`)
		}

		if(index > elements.length){
			throw new Error(`Cannot insert anything in index beyond array length (passed index = ${index}, array length = ${elements.length}); this will create sparse array, which is bad in multiple ways and should always be avoided.`)
		}
	}

	deleteElementsAtIndex<E>(this: BaseBox<readonly E[]>, index: number, count: number): void {
		if(count < 1){
			return
		}

		const oldValue = this.get()
		this.checkDeleteIndex(oldValue, index)

		count = Math.min(count, oldValue.length - index)
		if(count < 1){
			// yes, we are double-checking
			// previous check is useful for the case of user passing zero, and helps us to avoid calling .get()
			// which can be costly, depending on type of the box
			return
		}

		const deletedPairs: {index: number, value: unknown}[] = []
		for(let offset = 0; offset < count; offset++){
			const itemIndex = index + offset
			const itemValue = oldValue[itemIndex]
			deletedPairs.push({value: itemValue, index: itemIndex})
		}

		const newValue = [...oldValue.slice(0, index), ...oldValue.slice(index + count)]
		this.set(newValue, undefined, {type: "array_items_delete", indexValuePairs: deletedPairs})
	}

	deleteElementAtIndex<E>(this: BaseBox<readonly E[]>, index: number): void {
		this.deleteElementsAtIndex(index, 1)
	}

	private checkDeleteIndex(elements: readonly unknown[], index: number): void {
		if(index < 0){
			throw new Error(`Cannot delete element at negative index (passed index = ${index})`)
		}

		if(index > elements.length - 1){
			throw new Error(`Cannot delete anything starting from beyond array length (passed index = ${index}, array length = ${elements.length})`)
		}
	}

	deleteElements<E>(this: BaseBox<readonly E[]>, predicate: (item: E, index: number) => boolean): void {
		this.deleteElementsInternal(predicate, false)
	}

	deleteElement<E>(this: BaseBox<readonly E[]>, predicate: (item: E, index: number) => boolean): void {
		this.deleteElementsInternal(predicate, true)
	}

	private deleteElementsInternal<E>(this: BaseBox<readonly E[]>, predicate: (item: E, index: number) => boolean, stopAfterFirst: boolean): void {
		const oldValue = this.get()
		const deletedPairs: {index: number, value: unknown}[] = []
		const newValue: E[] = []
		for(let i = 0; i < oldValue.length; i++){
			const itemValue = oldValue[i]!
			if(predicate(itemValue, i)){
				newValue.push(itemValue)
			} else {
				deletedPairs.push({value: itemValue, index: i})
				if(stopAfterFirst){
					newValue.push(...oldValue.slice(i + 1))
					break
				}
			}
		}
		if(deletedPairs.length === 0){
			if(stopAfterFirst){
				throw new Error("Expected to find exactly one element to delete, but found none (predicate = " + predicate + ")")
			}
			return
		}
		this.set(newValue, undefined, {type: "array_items_delete", indexValuePairs: deletedPairs})
	}

	deleteAllElements<E>(this: BaseBox<readonly E[]>): void {
		this.set([], undefined, {type: "array_items_delete_all"})
	}

}

const throwOnReverseMapping = () => {
	throw new Error("This box does not support reverse-mapping")
}

const getNull = () => null