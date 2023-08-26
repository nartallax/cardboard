import {anythingToString, ArrayContextImpl, BoxInternal, UpstreamSubscriber, BoxUpdateMeta, ArrayItemWBox, ArrayContextControlledBox} from "src/internal"

/** A box that contains an array item */
export abstract class ArrayItemBox<T, K> extends ArrayContextControlledBox<T> implements ArrayItemWBox<T> {

	constructor(arrayContext: ArrayContextImpl<T, any, any>, value: T, public index: number, public key: K) {
		super(arrayContext, value)
	}

	override toString(): string {
		return `ArrayItemBox(${anythingToString(this.key)}, ${anythingToString(this.value)})`
	}

	override set(newValue: T, changeSourceBox?: BoxInternal<unknown> | UpstreamSubscriber): void {
		this.checkIfStillAttached()
		super.set(newValue, changeSourceBox)
	}

	protected override notifyOnValueChange(value: T, changeSource: BoxInternal<unknown> | UpstreamSubscriber | undefined, updateMeta: BoxUpdateMeta | undefined): void {
		if(changeSource !== this.arrayContext){
			this.arrayContext.onDownstreamChange(this, value)
		}
		super.notifyOnValueChange(value, changeSource, updateMeta)
	}

	deleteArrayElement(): void {
		this.checkIfStillAttached()
		this.arrayContext.upstream.deleteElementAtIndex(this.index)
	}

}

export class ArrayItemRBoxImpl<T, K> extends ArrayItemBox<T, K> {}
export class ArrayItemWBoxImpl<T, K> extends ArrayItemBox<T, K> {}