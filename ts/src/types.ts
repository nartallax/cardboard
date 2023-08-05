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
	subscribe(handler: ChangeHandler<T>): void

	/** Removes a subscriber from the box */
	unsubscribe(handler: ChangeHandler<T>): void

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

	/** If this box contains an array - this will create an array context for it
	 * Array context is a way to wrap individual elements of the array into their respective boxes,
	 * and that includes a lot of operation you may want to do on array, like sorting, inserting, removing, updating values in place etc.
	 *
	 * getKey function exists to make a link between array item and a box that contains that array item.
	 * It is expected that key will always be the same for item that is logically the same item.
	 * For example, if you have an array of pizza orders, you should return ID of the order from getKey function.
	 *
	 * You can use index, but it's only really usable in cases when no changes to the array order/size will be made.
	 * Otherwise all kinds of strange bugs may occur, like non-delivered updates. */
	getArrayContext<E, K>(this: WBox<readonly E[]>, getKey: (item: E, index: number) => K): ArrayContext<E, K, ArrayItemWBox<E>>

	/** Apply mapper to each individual value in the array, getting array with new items
	 * Will only apply mapper to new/changed items when the source array changes */
	mapArray<E, R>(this: WBox<readonly E[]>, mapper: (item: E, index: number) => R): RBox<R[]>
	mapArray<E, R>(this: WBox<readonly E[]>, mapper: (item: E, index: number) => R, reverseMapper: (item: R, index: number) => E): WBox<R[]>

	/** This will set value of a property if there's an object inside the box
	 * It's more optimal to do it that way instead of `.set({...value, [propName]: propValue})`,
	 * but otherwise will work the same */
	setProp<const K extends (keyof T) & (string | symbol)>(propName: K, propValue: T[K]): void

	/** Set array element value at specified index
	 * It's more optimal to do instead of copy, update and set, but otherwise will work the same. */
	setElementAtIndex<E>(this: WBox<readonly E[]>, index: number, value: E): void

	/** Insert new elements into value array so it has that index. Other elements will be shifted. */
	insertElementsAtIndex<E>(this: WBox<readonly E[]>, index: number, values: readonly E[]): void
	insertElementAtIndex<E>(this: WBox<readonly E[]>, index: number, value: E): void
	appendElement<E>(this: WBox<readonly E[]>, value: E): void
	appendElements<E>(this: WBox<readonly E[]>, values: readonly E[]): void
	prependElement<E>(this: WBox<readonly E[]>, value: E): void
	prependElements<E>(this: WBox<readonly E[]>, values: readonly E[]): void

	/** Remove elements at specified index from value array. Other elements will be shifted. */
	deleteElementsAtIndex<E>(this: WBox<readonly E[]>, index: number, count: number): void
	deleteElementAtIndex<E>(this: WBox<readonly E[]>, index: number): void

	/** Throw away every item from value array for which predicate returns false.
	 * Works like .filter() method of native array, just updates value inside the box instead of creating new box. */
	deleteElements<E>(this: WBox<readonly E[]>, predicate: (item: E, index: number) => boolean): void

	/** Like .deleteElement(), just stops after first element to delete is found.
	 * Useful in cases when you are sure that there's only one element that matches the predicate.
	 * Will throw if that single element is not found. */
	deleteElement<E>(this: WBox<readonly E[]>, predicate: (item: E, index: number) => boolean): void

	/** Clears array. Sets box to empty array. */
	deleteAllElements<E>(this: WBox<readonly E[]>): void
}

/** This is box that is part of some other box.
 * This box contains array item; upstream box contains whole array.  */
export interface ArrayItemWBox<T> extends WBox<T> {
	/** Remove this element from upstream box.
	 * After calling this method this box will become detached, and any attempts to interact with it will result in throw.
	 *
	 * (just like when you remove this box from upstream array via other ways) */
	deleteArrayElement(): void
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

export type ChangeHandler<T> = (value: T, box: RBox<T>, meta: UpdateMeta | undefined) => void

/** In reality all of the boxes are internally WBoxes */
export interface BoxInternal<T> extends WBox<T> {
	value: T | typeof NoValue
	haveSubscribers(): boolean
	subscribe(handler: ChangeHandler<T> | UpstreamSubscriber): void
	unsubscribe(handler: ChangeHandler<T> | UpstreamSubscriber): void
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

export type UpdateReceiver<T> = ChangeHandler<T> | UpstreamSubscriber

// TODO: think about reducing amount of generics in those types, we really don't need that much
export interface Subscription<T> {
	/** Last value with which handler was called.
	 * Having just a revision number won't do here, because value can go back-and-forth
	 * within one update session.
	 *
	 * This field must always contain value;
	 * when someone subscribes, it must be initiated with current value of the box.
	 * This is required to maintain the behaviour that subscriber knows what value the box had
	 * right before the subscription happens; so the call with the very same value could not happen in the next update.
	 *
	 * This shouldn't create noticeable memory leak, because it will either refer to NoValue,
	 * or to the same value as the box already has; it will only be different within update rounds */
	lastKnownValue: unknown
	readonly receiver: UpdateReceiver<T>
}