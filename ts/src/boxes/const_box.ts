import {ConstArrayContext, anythingToString, ArrayContext, RBox, WBox, BoxInternal, NoValue, ArrayItemWBox, BoxUpdateMeta} from "src/internal"

/** Make a new constant box, a readonly box which value never changes
 *
 * It exists mostly for convenience, to avoid writing two variants of code -
 * one for plain values and one for boxes */
export const constBox = <T>(value: T): RBox<T> => {
	return new ConstBoxImpl(value)
}

export class ConstBoxImpl<T> implements BoxInternal<T>, ArrayItemWBox<T> {
	readonly isConstBox!: true

	constructor(readonly value: T | typeof NoValue) {
		if(value === NoValue){
			throw new Error("ConstBox must always have a value")
		}
	}

	toString(): string {
		return `ConstBox(${anythingToString(this.value)})`
	}

	get(): T {
		return this.value as T
	}

	subscribe(): void {
		// nothing. handler will never be called anyway
	}

	unsubscribe(): void {
		// nothing. we don't do anything on subscription and might as well do nothing on unsubscription
	}

	haveSubscribers(): boolean {
		return false
	}

	map<R>(mapper: (value: T, meta: BoxUpdateMeta | undefined) => R) {
		return new ConstBoxImpl(mapper(this.value as T, undefined))
	}

	prop<K extends keyof T>(propName: K): WBox<T[K]> {
		return new ConstBoxImpl((this.value as T)[propName])
	}

	getArrayContext<E, K>(this: ConstBoxImpl<readonly E[]>, getKey: (item: E, index: number) => K): ArrayContext<E, K, ConstBoxImpl<E>> {
		return new ConstArrayContext<E, K>(this, getKey)
	}

	mapArrayElements<E, R>(this: WBox<E[]>, mapper: (item: E, index: number) => R): RBox<R[]>
	mapArrayElements<E, R>(this: WBox<E[]>, mapper: (item: E, index: number) => R, reverseMapper: (item: R, index: number) => E): WBox<R[]>
	mapArrayElements<E, R>(this: ConstBoxImpl<E[]>, mapper: (item: E, index: number) => R): RBox<R[]> | WBox<R[]> {
		return new ConstBoxImpl((this.value as E[]).map((item, index) => mapper(item, index)))
	}

	mapArray<E, K, R>(this: ConstBoxImpl<readonly E[]>, getKey: (item: E, index: number) => K, mapBox: (box: WBox<E>, index: number) => R): RBox<R[]> {
		const valueMap = new Map<K, R>()
		return new ConstBoxImpl((this.value as E[]).map((sourceValue, i) => {
			const key = getKey(sourceValue, i)
			if(valueMap.has(key)){
				return valueMap.get(key)!
			}

			const resultValue = mapBox(new ConstBoxImpl(sourceValue), i)
			valueMap.set(key, resultValue)
			return resultValue
		}))
	}

	set(): void {
		throwOnChange()
	}

	setProp(): void {
		throwOnChange()
	}

	setElementAtIndex(): void {
		throwOnChange()
	}

	insertElementsAtIndex(): void {
		throwOnChange()
	}

	insertElementAtIndex(): void {
		throwOnChange()
	}

	appendElement(): void {
		throwOnChange()
	}

	appendElements(): void {
		throwOnChange()
	}

	prependElement(): void {
		throwOnChange()
	}

	prependElements(): void {
		throwOnChange()
	}

	deleteElementsAtIndex(): void {
		throwOnChange()
	}

	deleteElementAtIndex(): void {
		throwOnChange()
	}

	deleteElements(): void {
		throwOnChange()
	}

	deleteElement(): void {
		throwOnChange()
	}

	deleteAllElements(): void {
		throwOnChange()
	}

	deleteArrayElement(): void {
		throwOnChange()
	}

	dispose(): void {
		throwOnChange()
	}
}

function throwOnChange(): never {
	throw new Error("You can't change anything about value of const box")
}

// ew. but we should do it to not diverge from typings
(ConstBoxImpl.prototype as any).isConstBox = true