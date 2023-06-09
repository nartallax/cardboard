import {Prototype, anythingToString, arraysShallowEqual, extractPrototype} from "src/common"

type SubscriberHandlerFn<T = unknown> = (value: T) => void
type UnsubscribeFn = () => void

interface RBoxFields<T>{
	/** Subscribe to receive new value every time it changes
	 * Returns function that will remove the subscription */
	subscribe(handler: SubscriberHandlerFn<T>): UnsubscribeFn

	/** Get a box that will update every time value of this box updates
	 * It is different from `viewBox(mapper)` because mapped box will only depend on source box
	 * (`viewBox(mapper)` will depend on all the boxes that mapper calls, which may be more than just this) */
	map<R>(mapper: (value: T) => R): RBox<R>

	/** Get a RBox that refers to the property in this box */
	prop<K extends keyof T>(propKey: K): RBox<T[K]>

	/** Wrap each element of this RBox (assuming it contains an array) in its own RBox
	 * More explaination in WBox's `wrapElements` comments */
	wrapElements<E, K>(this: RBox<readonly E[]>, getKey: (element: E) => K): RBox<readonly RBox<E>[]>

	/** A nice(r) way to use wrapElements
 	* Make a RBox each element of which is a result of conversion of a source elements.
	* Maintains order of elements as in original array; won't call mapper function for the same element twice */
	mapArray<E, K, R>(this: RBox<readonly E[]>, getKey: (element: E) => K, mapper: (elementBox: RBox<E>) => R): RBox<readonly R[]>

	/** This helps type inferrence, and also can be used to check for RBox instead of `isRBox(smth)` */
	readonly isRBox: true
}
type RBoxCallSignature<T> = () => T

interface RBoxFieldsInternal<T> extends RBoxFields<T>{
	readonly isRBox: true
	dispose(): void
	doSubscribe<B>(external: boolean, handler: SubscriberHandlerFn<T>, box?: RBoxInternal<B>): UnsubscribeFn
	haveSubscribers(): boolean
}

/** Readonly box. You can only look at the value and subscribe to it, but not change that value directly.
 * Behind this interface could be writeable box, or viewBox, or something else entirely. */
export type RBox<T> = RBoxCallSignature<T> & RBoxFields<T>
type RBoxInternal<T> = RBoxCallSignature<T> & RBoxFieldsInternal<T>
/** Maybe RBox - RBox or non-boxed value */
export type MRBox<T> = RBox<T> | T
/** Ensure that value is boxed */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Boxed<T> = [T] extends [WBox<infer X>] ? WBox<X> : [T] extends [RBox<infer Y>] ? RBox<Y> : RBox<T>


interface WBoxFields<T> extends RBoxFields<T>{
	/** Make property box, a box that contains a value of a property of an object of the value from the current box.
	 * New box will be linked with the source box, so they will update accordingly. */
	prop<K extends keyof T>(propKey: K): WBox<T[K]>

	/** If this box contains array, make a rbox that contains each element of this array wrapped in box
	 *
	 * Elements are bound to the values, not to the indices, so if the array is reordered - same values will stay in the same boxes
	 * Similarity of values is checked by keys. Key is what @param getKey returns.
	 * The only constraint on what key should be is it should be unique across the array. And it is compared by value.
	 * So you can have object-keys, they just must be the same objects every time, otherwise it won't work well.
	 * If original array is shrinked, excess boxes are detached from it and will always throw on read/write of the value,
	 * even if array grows again with values having same keys.
	 *
	 * Can behave weirdly/inconsistently if there are no subscribers to this box or children boxes. */
	wrapElements<E, K>(this: WBox<readonly E[]>, getKey: (element: E) => K): RBox<readonly WBox<E>[]>

	mapArray<E, K, R>(this: WBox<readonly E[]>, getKey: (element: E) => K, mapper: (elementBox: WBox<E>) => R): RBox<readonly R[]>

	/** Make a WBox that synchronises its value with this WBox */
	map<R>(mapper: (value: T) => R, reverseMapper: (value: R) => T): WBox<R>
	map<R>(mapper: (value: T) => R): RBox<R>

	/** This helps type inferrence, and also can be used to check for WBox instead of `isWBox(smth)` */
	readonly isWBox: true
}
type WBoxCallSignature<T> = RBoxCallSignature<T> & ((newValue: T) => T)

type WBoxFieldsInternal<T> = WBoxFields<T> & RBoxFieldsInternal<T> & {
	tryChangeValue<B>(value: T, box?: RBoxInternal<B>): void
}

/** Writeable box. Box that you can put value in, as well as look at value inside it and subscribe to it. */
export type WBox<T> = WBoxCallSignature<T> & WBoxFields<T>
type WBoxInternal<T> = WBoxCallSignature<T> & WBoxFieldsInternal<T>

/** Make a simple writeable box */
export const box: <T>(value: T) => WBox<T> = makeValueBox
/** Make a viewBox, a box that recalculates its value each time any of dependencies changed
 * In most of cases you can safely omit @param explicitDependencyList
 * dependency list will be inferred automatically for you from the computing function */
export const viewBox: <T>(computingFn: () => T, explicitDependencyList?: readonly RBox<unknown>[]) => RBox<T> = makeViewBox

/** constBox is a box which value never changes
 * exists mostly for convenience, to avoid writing two variants of code - one for plain values and one for boxes */
export const constBox: <T>(value: T) => RBox<T> = makeConstBox
/** If a value is a box - return it as is;
 * otherwise wrap it in constBox */
export const constBoxWrap = wrapInConstBox


export const isWBox: <T>(x: unknown) => x is WBox<T> = isWBoxInternal
function isWBoxInternal<T>(x: unknown): x is WBoxInternal<T> {
	return typeof(x) === "function" && (x as WBoxInternal<T>).isWBox === true
}

export const isRBox: <T>(x: unknown) => x is RBox<T> = isRBoxInternal
function isRBoxInternal<T>(x: unknown): x is RBoxInternal<T> {
	return typeof(x) === "function" && (x as RBoxInternal<T>).isRBox === true
}

export function isConstBox<T>(x: unknown): x is RBox<T> {
	return typeof(x) === "function" && (x as unknown as ConstBox<T>).isConstBox === true
}

export function unbox<T>(x: RBox<T> | T): T
export function unbox<T>(x: RBox<T> | T | undefined): T | undefined
export function unbox<T>(x: RBox<T> | T | null): T | null
export function unbox<T>(x: RBox<T> | T | null | undefined): T | null | undefined
export function unbox<T>(x: RBox<T> | T): T {
	return isRBox(x) ? x() : x
}


/*
============================================================================================
====== Here public part of box interface ends. Below are gory implementation details. ======
============================================================================================
*/

type NoValue = symbol
const noValue: NoValue = Symbol()

interface ExternalSubscriber<T>{
	lastKnownRevision: number
	lastKnownValue: T
	handler: SubscriberHandlerFn<T>
}

interface InternalSubscriber<T> extends ExternalSubscriber<T>{
	// those props are here to compare if we should notify when pushing updates
	box: RBoxInternal<unknown>
}

/** Stack of boxes that are currently computing their value
 * Each box that can possibly want to call other boxes should put an item on top of the stack
 * That way, proper dependency graph can be built */
class BoxNotificationStack {
	private notificationStack: (Set<RBox<unknown>> | null)[] = []
	withAccessNotifications<R>(action: () => R, onAccess: Set<RBox<unknown>> | null): R {
		this.notificationStack.push(onAccess)
		let result: R
		try {
			result = action()
		} finally {
			this.notificationStack.pop()
		}
		return result
	}

	notifyOnAccess<T>(v: RBox<T>): void {
		const stackTop = this.notificationStack[this.notificationStack.length - 1]
		if(stackTop){
			stackTop.add(v)
		}
	}
}


const notificationStack = new BoxNotificationStack()

/** Base for every Box */
abstract class BoxBase<T> {

	/** Revision is incremented each time value changes
	 *
	 * This value must never be visible outside of this box.
	 * It can only be used to prevent repeated calls of subscribers.
	 *
	 * It is very tempting to use revision number to check if value is changed or not
	 * However, it can go wrong when value does not change until you explicitly check
	 * For example, consider viewBox that depends on viewBox
	 * When there is no subscribers, first viewBox will never change, regardless of its sources
	 * And if you're only relying on revision number to check if it is changed, you'll be wrong */
	revision = 1

	/** Internal subscribers are subscribers that make up a graph of boxes */
	internalSubscribers: Set<InternalSubscriber<T>> | null = null
	/** External subscribers are subscribers that receive data outside of boxes graph */
	externalSubscribers: Set<ExternalSubscriber<T>> | null = null

	value: T | NoValue = noValue
	name = "" // will be overriden by actual function name

	haveSubscribers(): boolean {
		return this.internalSubscribers !== null || this.externalSubscribers !== null
	}

	/** After box is disposed, it should not be used anymore
	 * This is reserved for very special cases and cannot really be used on any kind of box */
	dispose(): void {
		this.value = noValue
		if(this.internalSubscribers){
			for(const sub of this.internalSubscribers){
				sub.box.dispose()
			}
			this.internalSubscribers = null
		}
	}

	doSubscribe<B>(external: boolean, handler: SubscriberHandlerFn<T>, box?: RBoxInternal<B>): UnsubscribeFn {
		const value = this.value
		if(value === noValue){
			throw new Error("Cannot subscribe to box: no value!")
		}

		if(external){
			const sub: ExternalSubscriber<T> = {
				handler,
				lastKnownRevision: this.revision,
				lastKnownValue: value as T
			}
			if(this.externalSubscribers === null){
				this.externalSubscribers = new Set()
			}
			this.externalSubscribers.add(sub)
			return () => {
				if(this.externalSubscribers){
					this.externalSubscribers.delete(sub)
					if(this.externalSubscribers.size === 0){
						this.externalSubscribers = null
					}
				}
			}
		} else {
			if(!box){
				throw new Error("Assertion failed")
			}
			const sub: InternalSubscriber<T> = {
				handler, box: box,
				lastKnownRevision: this.revision,
				lastKnownValue: value as T
			}
			if(this.internalSubscribers === null){
				this.internalSubscribers = new Set()
			}
			this.internalSubscribers.add(sub)
			return () => {
				if(this.internalSubscribers){
					this.internalSubscribers.delete(sub)
					if(this.internalSubscribers.size === 0){
						this.internalSubscribers = null
					}
				}
			}
		}
	}

	subscribe(handler: SubscriberHandlerFn<T>): UnsubscribeFn {
		return this.doSubscribe(true, handler)
	}

	tryChangeValue<B>(value: T, box?: RBox<B>): void {
		// yes, objects can be changed without the change of reference, so this check will fail on such change
		// it is explicit decision. that way, better performance can be achieved.
		// because it's much better to explicitly ask user to tell us if something is changed or not
		// (by cloning the object, changing the clone and setting the clone back into the box)
		// otherwise (in cases of large box graphs) it may lead to awfully degraded performance
		const valueChanged = this.value !== value
		this.value = value
		if(valueChanged){
			this.revision++
			this.notify(value, box)
		}
	}

	notify<B>(value: T, box: RBox<B> | undefined): void {
		const valueRevision = this.revision

		if(this.internalSubscribers){
			for(const sub of this.internalSubscribers){
			// if the notification came from the same box - we should not notify it again
				if(sub.box === box){
					// if the change came from that sub's box - the box must be more up-to-date than we are
					// so it makes sense to set last known values here
					sub.lastKnownRevision = valueRevision
					sub.lastKnownValue = value
					continue
				}

				this.maybeCallSubscriber(sub, value, valueRevision)
			}
		}

		if(valueRevision < this.revision){
			// this simple cutoff will only work well for external subscribers
			// for anything else there is a risk of not invoking a subscriber at all
			// (this check is a simple optimisation and can be turned off without noticeable change in behaviour)
			return
		}

		if(this.externalSubscribers){
			for(const sub of this.externalSubscribers){
				this.maybeCallSubscriber(sub, value, valueRevision)
			}
		}

	}

	private maybeCallSubscriber(sub: ExternalSubscriber<T>, value: T, valueRevision: number): void {
		if(sub.lastKnownRevision > valueRevision){
			return
		}

		// revision update should be strictly BEFORE content diff cutoff
		// because if we detect that value is the same and there is previous notify iteration running with different value,
		// then, without updating revision, that older iteration will invoke the handler with outdated value
		// which is big no-no
		sub.lastKnownRevision = valueRevision
		if(sub.lastKnownValue === value){
			return
		}
		sub.lastKnownValue = value
		sub.handler(value)
	}

	map<R>(this: RBox<T>, mapper: (value: T) => R): RBox<R> {
		return makeViewBox(() => mapper(this()), [this])
	}

	wrapElements<E, K>(this: RBox<readonly E[]>, getKey: (element: E) => K): ViewBox<readonly ValueBox<E>[]> {
		const result = makeViewBoxByPrototype<readonly ValueBox<E>[], ArrayValueWrapViewBox<E, K>>(arrayValueWrapViewBoxPrototype, [this])
		result.getKey = getKey
		result.upstream = this
		result.childMap = null
		Object.seal(result)
		return result
	}

	mapArray<E, K, R>(this: RBox<readonly E[]>, getKey: (element: E) => K, mapper: (elementBox: WBox<E>) => R): RBox<readonly R[]> {
		const map = new Map<WBox<E>, R>()

		return (this as WBox<E[]>).wrapElements(getKey).map(itemBoxes => {
			const leftoverBoxes = new Set(map.keys())

			const result = itemBoxes.map(itemBox => {
				leftoverBoxes.delete(itemBox)
				let el = map.get(itemBox)
				if(!el){
					el = mapper(itemBox)
					map.set(itemBox, el)
				}
				return el
			})

			for(const oldBox of leftoverBoxes){
				map.delete(oldBox)
			}

			return result
		})
	}

	toString(): string {
		return this.name + "(" + anythingToString(this.value) + ")"
	}

}

/** Just a box that just contains value */
class ValueBox<T> extends (BoxBase as {
	new<T>(): BoxBase<T> & WBoxCallSignature<T> & RBoxCallSignature<T>
})<T> implements WBoxFields<T> {

	isWBox = true as const
	isRBox = true as const

	prop<K extends keyof T>(propKey: K): WBox<T[K]> {
		// by the way, I could store propbox in some sort of map in the parent valuebox
		// and later, if someone asks for propbox for the same field, I'll give them the same propbox
		// this will simplify data logistics a little and possibly reduce memory consumption
		// however, I don't want to do that because it's relatively rare case - to have two propboxes on same field at the same time
		// and storing a reference to them in the parent will make them uneligible for GC, which is not very good
		// (not very bad either, there's a finite amount of them. but it's still something to avoid)
		if(Array.isArray(this.value)){
			throw new Error("You should not use prop() to get values of elements of the array. Use wrapElements() instead.")
		}

		const result = makeUpstreamBox<T[K], T, FixedPropValueBox<T, K>>(fixedPropValueBoxProto, this)
		result.propKey = propKey
		Object.seal(result)
		return result
	}

	map<R>(mapper: (value: T) => R, reverseMapper: (value: R) => T): WBox<R>
	map<R>(mapper: (value: T) => R): RBox<R>
	map<R>(mapper: (value: T) => R, reverseMapper?: (value: R) => T): RBox<R> | WBox<R> {
		if(reverseMapper === undefined){
			return super.map(mapper)
		}
		const result = makeUpstreamBox<R, T, MapperBoxWithUpstream<R, T>>(mapperBoxWithUpstreamProto, this)
		result.mapper = mapper
		result.reverseMapper = reverseMapper
		Object.seal(result)
		return result
	}

}

const valueBoxPrototype = extractPrototype(ValueBox)
valueBoxPrototype.isWBox = true
valueBoxPrototype.isRBox = true

/** Box that is subscribed to one other box only when it has its own subscriber(s)
 * Usually that other box is viewed as upstream; source of data that this box is derived from */
abstract class ValueBoxWithUpstream<T, U = unknown, B extends RBoxInternal<U> = RBoxInternal<U>> extends ValueBox<T> {

	upstreamUnsub: UnsubscribeFn | null = null
	upstream = null as unknown as B
	lastKnownUpstreamValue: U | null = null

	protected abstract extractValueFromUpstream(upstreamObject: U): T
	protected abstract buildUpstreamValue(value: T): U

	protected fetchValueFromUpstream(): T {
		return this.extractValueFromUpstream(this.getUpstreamValue())
	}

	protected shouldBeSubscribed(): boolean {
		return this.haveSubscribers()
	}

	protected doOnUpstreamChange(upstreamValue: U): void {
		const ourValue = this.extractValueFromUpstream(upstreamValue)
		this.tryChangeValue(ourValue, this.upstream)
	}

	protected notifyUpstreamOnChange(value: T): void {
		if(!isWBoxInternal(this.upstream)){
			throw new Error("Value box cannot update upstream value: upstream is readonly")
		}
		const upstreamObject = this.buildUpstreamValue(value)
		this.lastKnownUpstreamValue = upstreamObject
		this.upstream.tryChangeValue(upstreamObject, this)
	}

	protected getUpstreamValue(): U {
		// if we are called from view calc function - we should prevent view to access our upstream box
		// so view will only subscribe to this box, but not to the parent
		return notificationStack.withAccessNotifications(this.upstream, null)
	}

	getBoxValue(): T {
		let upstreamValue: U | null = null
		if(this.value !== noValue){
			// just checking if we have value before returning it is not enough
			// sometimes when we have value we can be not subscribed
			// that means that our value can be outdated and we need to fetch new one regardless
			if(this.upstreamUnsub !== null){
				return this.value as T
			}

			upstreamValue = notificationStack.withAccessNotifications(this.upstream, null)
			if(this.lastKnownUpstreamValue === upstreamValue){
				return this.value as T
			}
		}

		this.lastKnownUpstreamValue = upstreamValue ||= notificationStack.withAccessNotifications(this.upstream, null)
		this.value = this.fetchValueFromUpstream()
		return this.value
	}

	tryUpdateUpstreamSub(): void {
		const shouldBeSub = this.shouldBeSubscribed()
		if(shouldBeSub && !this.upstreamUnsub){
			this.subToUpstream()
		} else if(!shouldBeSub && this.upstreamUnsub){
			this.unsubFromUpstream()
		}
	}

	private unsubFromUpstream() {
		if(!this.upstreamUnsub){
			throw new Error("Assertion failed")
		}
		this.upstreamUnsub()
		this.upstreamUnsub = null
	}

	private subToUpstream(): void {
		if(this.upstreamUnsub){
			throw new Error("Assertion failed")
		}
		if(this.value === noValue){
			this.value = this.getBoxValue()
		}
		this.upstreamUnsub = this.upstream.doSubscribe(false, this.doOnUpstreamChange.bind(this), this)
	}

	override doSubscribe<B>(external: boolean, handler: SubscriberHandlerFn<T>, box?: RBoxInternal<B>): UnsubscribeFn {
		if(this.value === noValue){
			this.value = this.getBoxValue()
		}
		const unsub = super.doSubscribe(external, handler, box)
		this.tryUpdateUpstreamSub()
		return () => {
			unsub()
			this.tryUpdateUpstreamSub()
		}
	}

	override notify<B>(value: T, box: RBox<B> | undefined): void {
		// this is a little out of place
		// think of this block as a notification to parent that child value is changed
		// (although this is not conventional call to subscription)
		if(box as unknown !== this.upstream){
			this.notifyUpstreamOnChange(value)
		}

		super.notify(value, box)
	}
}

class MapperBoxWithUpstream<T, U> extends ValueBoxWithUpstream<T, U> {
	mapper = null as unknown as (value: U) => T
	reverseMapper = null as unknown as (value: T) => U

	protected override extractValueFromUpstream(upstreamObject: U): T {
		return this.mapper(upstreamObject)
	}

	protected override buildUpstreamValue(value: T): U {
		return this.reverseMapper(value)
	}
}
const mapperBoxWithUpstreamProto = extractPrototype(MapperBoxWithUpstream)

class FixedPropValueBox<U, K extends keyof U> extends ValueBoxWithUpstream<U[K], U> {

	propKey: K = null as unknown as K

	protected override extractValueFromUpstream(upstreamObject: U): U[K] {
		return upstreamObject[this.propKey]
	}

	protected override buildUpstreamValue(value: U[K]): U {
		const upstreamObject = this.getUpstreamValue()
		if(Array.isArray(upstreamObject)){
			throw new Error(`Upstream object is an array! Cannot properly clone it to set the property "${this.propKey.toString()}" value.`)
		}
		return {
			...upstreamObject,
			[this.propKey]: value
		}
	}

}
const fixedPropValueBoxProto = extractPrototype(FixedPropValueBox)

function makeUpstreamBox<T, U, B>(prototype: Prototype<ValueBoxWithUpstream<T, U> & B>, upstream: RBoxInternal<U>): ValueBoxWithUpstream<T, U> & B {

	function upstreamValueBox(...args: T[]): T {
		if(args.length === 0){
			notificationStack.notifyOnAccess(result)
		} else {
			result.tryChangeValue(args[0]!)
		}

		return result.getBoxValue()
	}

	const result: ValueBoxWithUpstream<T, U> & B = Object.setPrototypeOf(upstreamValueBox, prototype)
	result.value = noValue
	result.upstreamUnsub = null
	result.upstream = upstream
	result.internalSubscribers = null
	result.externalSubscribers = null
	result.lastKnownUpstreamValue = null
	result.revision = 1
	return result
}

function makeValueBox<T>(value: T): ValueBox<T> {

	function valueBox(...args: T[]): T {
		if(args.length < 1){
			notificationStack.notifyOnAccess(result)
		} else {
			result.tryChangeValue(args[0]!)
		}

		if(result.value === noValue){
			// should never happen
			throw new Error("After executing valueBox the value is absent!")
		}

		return result.value as T
	}

	const result: ValueBox<T> = Object.setPrototypeOf(valueBox, valueBoxPrototype)
	result.value = value
	result.revision = 1
	result.internalSubscribers = null
	result.externalSubscribers = null
	Object.seal(result)

	return result
}


abstract class ViewBox<T> extends (BoxBase as {
	new<T>(): BoxBase<T> & RBoxCallSignature<T>
})<T> implements RBoxFieldsInternal<T> {

	isRBox = true as const
	/*
	Here it gets a little tricky.
	Lifetime of the view is by definition lower than lifetime of values it depends on
	(because those values are referenced through closure expression of the view)
	But when every external reference to the view is gone, it should be eligible to get GCed
	which is not possible if it stays subscribed, because subscription will hold a reference to the view
	(it is btw typical "lapsed listeners" problem)

	To avoid this we employ the following tactics:
	1. view don't store ANYTHING when noone is subscribed (no list of dependencies, no value, nothing)
	in this mode view just calls computing function when asked for the value
	2. when we HAVE subscribers to view - value is stored, list of dependencies is stored
	view returns stored value when asked for value in this mode

	This way, you only need to remove all subscribers from view for it to be eligible to be GCed
	*/
	subDisposers: UnsubscribeFn[] | null = null
	onDependencyListUpdated: null | (() => void) = null

	boundCalcVal: (() => T) | null = null
	protected abstract calculateValue(): T

	explicitDependencyList: readonly RBox<unknown>[] | null = null
	explicitDependencyValues: readonly unknown[] | null = null
	isCalculatingNow = false

	private subDispose(): void {
		if(this.subDisposers !== null){
			this.subDisposers.forEach(x => x())
			this.subDisposers = null
		}
	}

	private shouldRecalcValue(): boolean {
		const newDepValues = this.getExplicitDepValues()
		if(newDepValues !== null){
			if(this.areAllExplicitDepsUnchanged(newDepValues)){
				return false
			}
			this.explicitDependencyValues = newDepValues
			return true
		}

		if(this.value === noValue){
			return true // no value? let's recalculate
		}

		if(this.subDisposers === null){
			// we are not subscribed to anyone
			// that means calcFunction either is constant expression, or depends on some plain variables that can change
			// better recalculate
			return true
		}

		return false // we have value, no need to do anything
	}

	private getExplicitDepValues(): unknown[] | null {
		if(this.explicitDependencyList === null){
			return null
		}

		return this.explicitDependencyList.map(value => value())
	}

	private areAllExplicitDepsUnchanged(newDepValues: unknown[]): boolean {
		if(this.explicitDependencyList === null){
			return false
		}

		return !!this.explicitDependencyValues && arraysShallowEqual(newDepValues, this.explicitDependencyValues)
	}

	private recalcValueAndResubscribe(forceSubscribe: boolean): void {
		// we preserve list of our old subscriptions to drop them only at the end of the method
		// we do that because some box implementations can change its internal state dramatically when they have 0 subs
		// and to prevent them going back and forth, we first create new subscribers, and only then let go old ones
		const oldSubDisposers = this.subDisposers !== null ? [...this.subDisposers] : null

		let newValue: T
		let depList: readonly RBoxInternal<unknown>[]
		const calc = this.boundCalcVal ||= this.calculateValue.bind(this)
		if(this.explicitDependencyList === null){
			const boxesAccessed = new Set<RBoxInternal<unknown>>()
			newValue = notificationStack.withAccessNotifications(calc, boxesAccessed)
			depList = [...boxesAccessed]
		} else {
			const newDepValues = this.getExplicitDepValues()!
			if(this.areAllExplicitDepsUnchanged(newDepValues) && this.value !== noValue){
				newValue = this.value as T
			} else {
				this.explicitDependencyValues = newDepValues
				newValue = notificationStack.withAccessNotifications(calc, null)

			}
			depList = this.explicitDependencyList as RBoxInternal<unknown>[]
		}

		// we can safely not pass a box here
		// because box is only used to prevent notifications to go back to original box
		// and we should never be subscribed to itself, because it's not really possible
		this.tryChangeValue(newValue)

		// this check is here because as a result of recalculation we may lose all of our subscribers
		// and therefore we don't need to be subscribed to anything anymore
		// (that's the case with array wrap)
		if(forceSubscribe || this.haveSubscribers()){
			if(depList.length > 0){
				const doOnDependencyUpdated = this.onDependencyListUpdated ||= () => this.recalcValueAndResubscribe(false)
				if(this.subDisposers === null){
					this.subDisposers = []
				}
				for(let i = 0; i < depList.length; i++){
					this.subDisposers.push(depList[i]!.doSubscribe(false, doOnDependencyUpdated, this))
				}
			}
		} else if(!this.explicitDependencyList){
			this.value = noValue
		}
		if(oldSubDisposers){
			for(const subDisposer of oldSubDisposers){
				subDisposer()
			}
			if(this.subDisposers){
				if(this.subDisposers.length === oldSubDisposers.length){
					this.subDisposers = null
				} else {
					// ew. maybe there is some more efficient structure for that...?
					this.subDisposers = this.subDisposers.slice(oldSubDisposers.length)
				}
			}
		}
	}

	override doSubscribe<B>(external: boolean, handler: SubscriberHandlerFn<T>, box?: RBoxInternal<B>): UnsubscribeFn {
		if(!this.haveSubscribers()){
			// because we must have a value before doSubscribe can be called
			// and also we will have a sub right now, might as well prepare for that
			this.recalcValueAndResubscribe(true)
		}
		const unsub = super.doSubscribe(external, handler, box)
		return () => {
			unsub()
			if(!this.haveSubscribers()){
				this.subDispose()
				this.value = noValue
				this.explicitDependencyValues = null
			}
		}
	}

	getValue(): T {
		if(this.isCalculatingNow){
			throw new Error("Trying to get a value of box while the value is being recalculated; this indicates a loop in value calculation.")
		}

		this.isCalculatingNow = true
		try {
			notificationStack.notifyOnAccess(this)

			if(!this.shouldRecalcValue()){
				return this.value as T
			}

			const calc = this.boundCalcVal ||= this.calculateValue.bind(this)
			const result = notificationStack.withAccessNotifications(calc, null)
			if(this.explicitDependencyList !== null){
				this.value = result
			}
			return result
		} finally {
			this.isCalculatingNow = false
		}
	}

	prop<K extends keyof T>(propKey: K): RBox<T[K]> {
		return this.map(v => v[propKey])
	}

}

// this prototype isn't even used anywhere directly, because ViewBox is abstract
// so let's just extract it directly; the only reason we may need it is to add isRBox property
const viewBoxPrototype = ViewBox.prototype
viewBoxPrototype.isRBox = true


class ComputingFnViewBox<T> extends ViewBox<T> {
	calculateValue = null as unknown as () => T
}

const computinFnViewBoxPrototype = extractPrototype(ComputingFnViewBox)

function makeViewBox<T>(computingFn: () => T, explicitDependencyList?: readonly RBox<unknown>[]): ViewBox<T> {
	const result = makeViewBoxByPrototype<T, ComputingFnViewBox<T>>(computinFnViewBoxPrototype, explicitDependencyList)
	result.calculateValue = computingFn
	Object.seal(result)
	return result
}

function makeViewBoxByPrototype<T, B extends ViewBox<T>>(prototype: Prototype<B>, explicitDependencyList?: readonly RBox<unknown>[]): B {
	function viewBox(): T {
		return result.getValue()
	}

	const result: B = Object.setPrototypeOf(viewBox, prototype)
	result.value = noValue
	result.explicitDependencyList = explicitDependencyList ?? null
	result.explicitDependencyValues = null
	result.isCalculatingNow = false
	result.internalSubscribers = null
	result.externalSubscribers = null
	result.subDisposers = null
	result.onDependencyListUpdated = null
	result.boundCalcVal = null
	result.revision = 1
	return result
}

class ArrayValueWrapViewBox<T, K> extends ViewBox<readonly ValueBox<T>[]> {

	childMap: Map<K, ArrayElementValueBox<T, K>> | null = null
	getKey = null as unknown as (value: T) => K
	upstream = null as unknown as RBox<readonly T[]>

	protected override calculateValue(): ValueBox<T>[] {
		if(this.childMap === null){
			this.childMap = new Map()
		}
		const outdatedKeys = new Set(this.childMap.keys())

		const upstreamArray = notificationStack.withAccessNotifications(this.upstream, null)
		if(!Array.isArray(upstreamArray)){
			throw new Error("Assertion failed: upstream value is not array for array-wrap box")
		}
		const result = upstreamArray.map((item, index) => {
			const key = this.getKey(item)
			let box = this.childMap!.get(key)
			if(box){
				if(!outdatedKeys.has(key)){
					throw new Error("Constraint violated, key is not unique: " + key)
				}
				box.index = index
				box.tryChangeValue(item, this)
			} else {
				box = makeUpstreamBox<T, readonly ValueBox<T>[], ArrayElementValueBox<T, K>>(arrayElementValueBoxProto, this)
				box.internalSubscribers = null
				box.externalSubscribers = null
				box.revision = 1
				box.index = index
				box.value = item
				box.key = key
				box.disposed = false
				Object.seal(box)
				this.childMap!.set(key, box)
			}

			outdatedKeys.delete(key)

			return box
		})

		for(const key of outdatedKeys){
			const box = this.childMap.get(key)!
			box.dispose()
			this.childMap.delete(key)
		}

		return result
	}

	tryUpdateChildrenValues(): void {
		this.calculateValue()
	}

	notifyValueChanged(value: T, box: ArrayElementValueBox<T, K>): void {
		if(!isWBoxInternal<T[]>(this.upstream)){
			// should be prevented by typechecker anyway
			throw new Error("You cannot change the value of upstream array in readonly box through wrap-box")
		}
		if(this.childMap === null){
			this.childMap = new Map()
		}

		const key = this.getKey(value)
		const existingBox = this.childMap.get(key)
		const oldBoxKey = box.key
		if(!existingBox){
			this.childMap.delete(box.key)
			this.childMap.set(key, box)
			box.key = key
		} else if(existingBox !== box){
			throw new Error("Constraint violated, key is not unique: " + key)
		}

		// Q: why do we search for key here?
		// A: see explaination in element wrap impl
		// (in short, index could change between updates, that's why we don't rely on them)
		let upstreamValue = notificationStack.withAccessNotifications(this.upstream, null)
		upstreamValue = [...upstreamValue]
		let index = -1
		if(this.haveSubscribers()){
			// if we are subscribed - we can use index, it is guaranteed to be consistent with the upstream
			// it is optimisation anyway; if it will cause trouble - we always can just search for the key every time
			index = box.index
		} else {
			for(let i = 0; i < upstreamValue.length; i++){
				const item = upstreamValue[i]!
				const itemKey = this.getKey(item)
				if(itemKey === oldBoxKey){
				// we can just break on the first found key, I'm just all about assertions
				// btw maybe this assertion will break some of legitimate use cases..?
					if(index >= 0){
						throw new Error("Constraint violated, key is not unique: " + oldBoxKey)
					}
					index = i
				}
			}

			if(index < 0){
				// value with old key is not found
				// that means the box was detached before it received an update
				box.dispose()
				box.throwDetachedError()
			}
		}

		upstreamValue[index] = value
		this.upstream.tryChangeValue(upstreamValue, this)
	}

}

const arrayValueWrapViewBoxPrototype = extractPrototype(ArrayValueWrapViewBox)

/** A wrap around single element of an array.
 * This is more of a view box than a box-with-upstream;
 * Making it a box-with-upstream only makes it more performant */
class ArrayElementValueBox<T, K> extends ValueBoxWithUpstream<T, readonly ValueBox<T>[], ArrayValueWrapViewBox<T, K>> {

	disposed = false
	index = -1
	key = null as unknown as K

	override dispose(): void {
		this.disposed = true
		// update of sub may or may not set empty value (if there is no sub)
		// let's set it explicitly
		this.value = noValue
		this.tryUpdateUpstreamSub()
		super.dispose()
	}

	protected override shouldBeSubscribed(): boolean {
		return !this.disposed && super.shouldBeSubscribed()
	}

	protected override fetchValueFromUpstream(): T {
		/*
		this is bad, but I don't see a better solution
		thing is, when you're not subscribed - you have absolutely zero guarantees that upstream did not change
		(and you can't be always subscribed because it will create memory leak)
		this has two consequences:
		1. you can't rely that `index` stays the same
		(so you cannot just grab upstream, take value on the index and expect it to be the value you're after)
		2. you can't rely that your value is still in the array at all
		(so you may become detached at arbitrary moment, possibly with outdated value)
		we combat those two consequences with following countermeasures:
		1. when we need to get the value, we ALWAYS receive value from wrapper box. no exceptions.
		alternative to that will be grabbing upstream array, iterating over each item and checking for key equality
		but this will be terrible for performance
		2. we forbid accessing detached values at all
		this is bad because two things: it can unexpectedly break, and it is inconsistent
		I mean, who knows when exactly value disappeared from upstream array if we was not subscribed to it?
		noone knows! and by that reason box may become detached (if update happened during absence of value),
		or not (if it did not happen, or happened after value with the same key appears in array again)
		what can go wrong, usage-wise?
		well, if user stores element wrapper boxes - he should be prepared that sometimes they can throw
		*/
		this.checkNotDisposed()
		this.upstream.tryUpdateChildrenValues()
		this.checkNotDisposed() // second check, we may become disposed after update
		return this.value as T
	}

	private checkNotDisposed(): void {
		if(this.disposed){
			this.throwDetachedError()
		}
	}

	throwDetachedError(): void {
		throw new Error("Element wrap box for key " + anythingToString(this.key) + " is no longer attached to an upstream box, because upstream box does not have this key, or did not have this key in some time in the past after this box was created.")
	}

	protected override extractValueFromUpstream(): T {
		throw new Error("This method should never be called on this box")
	}

	protected override buildUpstreamValue(): ValueBox<T>[] {
		throw new Error("This method should never be called on this box")
	}

	protected override doOnUpstreamChange(): void {
		// nothing. upstream will put value into this box by itself
		// element box must never subscribe to upstream-of-upstream array-box directly, or pull values by itself
		// this way its index can sometimes be outdated and he can pull wrong value from upstream
		// instead, element box must force parent view to subscribe to upstream
		// so parent view can handle down proper index and value at the same time
		// so, we still subscribe to upstream, just so it is subscribed to upstream-of-upstream and deliver updates
	}

	protected notifyUpstreamOnChange(value: T): void {
		this.checkNotDisposed()
		this.upstream.notifyValueChanged(value, this)
	}

}
const arrayElementValueBoxProto = extractPrototype(ArrayElementValueBox)


class ConstBox<T> implements RBoxFieldsInternal<T> {
	isRBox = true as const
	isConstBox = true as const
	value: T = null as unknown as T

	subscribe() {
		return constBoxUnsubscribeNoop
	}

	map<R>(mapper: (value: T) => R): RBox<R> {
		return makeConstBox(mapper(this.value))
	}

	prop<K extends keyof T>(propKey: K): RBox<T[K]> {
		return makeConstBox(this.value[propKey])
	}

	wrapElements<E, K>(this: RBox<readonly E[]>, getKey: (element: E) => K): RBox<readonly RBox<E>[]> {
		void getKey
		return makeConstBox((this as unknown as ConstBox<readonly E[]>).value.map(item => makeConstBox(item)))
	}

	mapArray<E, K, R>(this: RBox<readonly E[]>, getKey: (element: E) => K, mapper: (elementBox: RBox<E>) => R): RBox<readonly R[]> {
		void getKey
		return makeConstBox((this as unknown as ConstBox<readonly E[]>).value.map(item => mapper(makeConstBox(item))))
	}

	doSubscribe(external: boolean, subscriber: SubscriberHandlerFn<T>): UnsubscribeFn {
		void external, subscriber
		return constBoxUnsubscribeNoop
	}

	dispose(): void {
		// absolutely nothing!
	}

	haveSubscribers(): boolean {
		return false
	}

}

function constBoxUnsubscribeNoop(): void {
	// it's nothing!
}

const constBoxProto = ConstBox.prototype
constBoxProto.isRBox = true
constBoxProto.isConstBox = true

function makeConstBox<T>(value: T): RBox<T> {
	function constBox(): T {
		return value as T
	}

	const result: ConstBox<T> & RBox<T> = Object.setPrototypeOf(constBox, constBoxProto)
	result.value = value
	Object.seal(result)
	return result
}

function wrapInConstBox<T>(value: WBox<T>): WBox<T>
function wrapInConstBox<T>(value: RBox<T>): RBox<T>
// formal logic tells us that this case should be covered by case above and below
// but it's not true (and there's a test for that)
function wrapInConstBox<T>(value: MRBox<T>): RBox<T>
function wrapInConstBox<T>(value: T): RBox<T>
function wrapInConstBox<T>(value: T): WBox<T> | RBox<T> {
	return isRBox<T>(value) ? value : makeConstBox(value)
}