import {ConstArrayContext, anythingToString, ArrayContext, RBox, WBox, BoxInternal, NoValue, ArrayItemWBox} from "src/internal"

/** Make a new constant box, a readonly box which value never changes
 *
 * It exists mostly for convenience, to avoid writing two variants of code -
 * one for plain values and one for boxes */
export const constBox = <T>(value: T): RBox<T> => {
	return new ConstBox(value)
}

export class ConstBox<T> implements BoxInternal<T>, ArrayItemWBox<T> {
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

	map<R>(mapper: (value: T) => R): WBox<R> {
		return new ConstBox(mapper(this.value as T))
	}

	prop<K extends keyof T>(propName: K): WBox<T[K]> {
		return new ConstBox((this.value as T)[propName])
	}

	getArrayContext<E, K>(this: ConstBox<readonly E[]>, getKey: (item: E, index: number) => K): ArrayContext<E, K, ConstBox<E>> {
		return new ConstArrayContext<E, K>(this, getKey)
	}

	mapArray<E, R>(this: WBox<E[]>, mapper: (item: E, index: number) => R): RBox<R[]>
	mapArray<E, R>(this: WBox<E[]>, mapper: (item: E, index: number) => R, reverseMapper: (item: R, index: number) => E): WBox<R[]>
	mapArray<E, R>(this: ConstBox<E[]>, mapper: (item: E, index: number) => R): RBox<R[]> | WBox<R[]> {
		return new ConstBox((this.value as E[]).map((item, index) => mapper(item, index)))
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