import {NoValue, UpdateMeta} from "src/internal"

/** Readonly box: a box which contents you can get, but cannot directly put anything into. */
export interface RBox<T>{
	/** Get the value that is stored in this box. */
	get(): T

	/** Subscribe to receive new value every time it changes.
	 * One function may only be added once as a handler;
	 * subscribing second time with the same function does nothing.
	 *
	 * Note that the handler is stored until explicitly unsubscribed;
	 * this may cause memory leaks in some scenarios. */
	subscribe(handler: ChangeHandler<T, this>): void

	/** Removes a subscriber from the box */
	unsubscribe(handler: ChangeHandler<T, this>): void

	/** Create another box, value of which entirely depends on value of this one box
	 *
	 * Even if other boxes are used in this box, they won't trigger recalculation */
	map<R>(mapper: (value: T) => R): RBox<R>

	/** Create another box which holds value of a property under that name */
	prop<const K extends (keyof T) & (string | symbol)>(this: RBox<T>, propName: K): RBox<T[K]>

	/** If this box contains an array - this will create an array context for it */
	getArrayContext<E, K>(this: RBox<readonly E[]>, getKey: (item: E, index: number) => K): ArrayContext<E, K, RBox<E>>

	/** Apply mapper to each individual value in the array, getting array with new items
	 * Will only apply mapper to new/changed items when the source array changes */
	mapArray<E, R>(this: RBox<readonly E[]>, mapper: (item: E, index: number) => R): RBox<R[]>
}

/** Writable box: a box in which you can put value, and get value from. */
export interface WBox<T> extends RBox<T> {
	/** Put the value in the box, overwriting existing value and calling all the change handlers. */
	set(value: T): void

	map<R>(mapper: (value: T) => R): RBox<R>
	/** Create another box, value of which entirely depends on value of this one box
	 * New box will also propagate its value to this box if changed
	 *
	 * Even if other boxes are used in this box, they won't trigger recalculation */
	map<R>(mapper: (value: T) => R, reverseMapper: (value: R) => T): WBox<R>

	/** Create another box which holds value of a property under that name */
	prop<const K extends (keyof T) & (string | symbol)>(this: WBox<T>, propName: K): WBox<T[K]>
	prop<const K extends (keyof T) & (string | symbol)>(this: RBox<T>, propName: K): RBox<T[K]>

	/** If this box contains an array - this will create an array context for it */
	getArrayContext<E, K>(this: WBox<readonly E[]>, getKey: (item: E, index: number) => K): ArrayContext<E, K, WBox<E>>

	/** Apply mapper to each individual value in the array, getting array with new items
	 * Will only apply mapper to new/changed items when the source array changes */
	mapArray<E, R>(this: WBox<readonly E[]>, mapper: (item: E, index: number) => R): RBox<R[]>
	mapArray<E, R>(this: WBox<readonly E[]>, mapper: (item: E, index: number) => R, reverseMapper: (item: R, index: number) => E): WBox<R[]>

	/** This will set value of a property if there's an object inside the box
	 * It's more optimal to do it that way instead of `.set({...value, [propName]: propValue})`,
	 * but otherwise will work the same */
	setProp<const K extends (keyof T) & (string | symbol)>(propName: K, propValue: T[K]): void
}

/** An object that helps to manage boxes that wrap individual items of an array box */
export interface ArrayContext<T, K, B extends RBox<T>>{
	getBoxes(): B[]
	getBoxForKey(key: K): B
}

/** Maybe RBox - RBox or non-boxed value */
export type MRBox<T> = RBox<T> | T

/** If the type is non-box - wrap it in RBox value
 *
 * Does the same to types that constBoxWrap() does to values */
export type Boxed<T> = TakeBoxes<T> | RBox<TakeNonBoxes<T>>
type TakeBoxes<T> = T extends RBox<any> ? T : never
type TakeNonBoxes<T> = T extends RBox<any> ? never : T

/** Returns the value type of the box, if T is the box; otherwise returns T
 *
 * Does the same to types that unbox() does to values */
export type Unboxed<T> = T extends RBox<infer X> ? X : T

export type ChangeHandler<T, B extends RBox<T> = RBox<T>> = (value: T, box: B) => void

/** In reality all of the boxes are internally WBoxes */
export interface BoxInternal<T> extends WBox<T> {
	value: T | typeof NoValue
	getExistingValue(): T
	subscribeInternal(box: UpstreamSubscriber): void
	unsubscribeInternal(box: UpstreamSubscriber): void
	haveSubscribers(): boolean
	set(value: T, box?: BoxInternal<unknown> | UpstreamSubscriber, updateMeta?: UpdateMeta): void
}

/** A box or other entity that could internally subscribe to upstream box */
export interface UpstreamSubscriber {
	onUpstreamChange(upstream: BoxInternal<unknown>, updateMeta?: UpdateMeta): void
	dispose(): void
}

/** A list of boxes some calculation depends on  */
export interface DependencyList {
	/** Goes all the known dependencies and checks if any of those did change */
	didDependencyListChange(): boolean
	unsubscribeFromDependencies(owner: UpstreamSubscriber): void
	subscribeToDependencies(owner: UpstreamSubscriber): void
	/** Calculate and .set() value of the owner box */
	calculate<T>(owner: CalculatableBox<T>, changeSourceBox?: BoxInternal<unknown>): void
}

export interface CalculatableBox<T> extends BoxInternal<T>, UpstreamSubscriber {
	calculate(): T
	readonly dependencyList: DependencyList
}