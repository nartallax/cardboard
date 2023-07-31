import {ConstArrayContext, anythingToString, ArrayContext, RBox, WBox, BoxInternal, NoValue} from "src/internal"

/** Make a new constant box, a readonly box which value never changes
 *
 * It exists mostly for convenience, to avoid writing two variants of code -
 * one for plain values and one for boxes */
export const constBox = <T>(value: T): RBox<T> => {
	return new ConstBox(value)
}

export class ConstBox<T> implements BoxInternal<T> {
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

	getExistingValue(): T {
		return this.value as T
	}

	set(): void {
		throw new Error("You cannot set anything to constant box")
	}

	subscribe(): void {
		// nothing. handler will never be called anyway
	}

	subscribeInternal(): void {
		// nothing
	}

	unsubscribe(): void {
		// nothing. we don't do anything on subscription and might as well do nothing on unsubscription
	}

	unsubscribeInternal(): void {
		// nothing
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

	getArrayContext<E, K>(this: ConstBox<E[]>, getKey: (item: E, index: number) => K): ArrayContext<E, K, WBox<E>> {
		return new ConstArrayContext<E, K>(this, getKey)
	}

	mapArray<E, R>(this: WBox<E[]>, mapper: (item: E, index: number) => R): RBox<R[]>
	mapArray<E, R>(this: WBox<E[]>, mapper: (item: E, index: number) => R, reverseMapper: (item: R, index: number) => E): WBox<R[]>
	mapArray<E, R>(this: ConstBox<E[]>, mapper: (item: E, index: number) => R): RBox<R[]> | WBox<R[]> {
		return new ConstBox((this.value as E[]).map((item, index) => mapper(item, index)))
	}

	setProp(): void {
		throw new Error("You can't set anything on const box")
	}
}