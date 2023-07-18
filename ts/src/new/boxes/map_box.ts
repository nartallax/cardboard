import {DownstreamBoxImpl, SingleDependencyList, WBoxInternal, notificationStack} from "src/new/internal"

export class MapBox<T, U> extends DownstreamBoxImpl<T> {

	constructor(
		private readonly upstream: WBoxInternal<U>,
		private readonly mapper: (value: U) => T,
		private readonly reverseMapper: (value: T) => U) {

		super()
		this.init(new SingleDependencyList(this, upstream))
	}

	override calculate(): T {
		return this.mapper(notificationStack.getWithoutNotifications(this.upstream))
	}

	protected override notifyOnValueChange(value: T, changeSourceBox?: WBoxInternal<unknown>): boolean {
		if(!super.notifyOnValueChange(value, changeSourceBox)){
			return false
		}

		this.upstream.set(this.reverseMapper(value), this)
		return true
	}

}