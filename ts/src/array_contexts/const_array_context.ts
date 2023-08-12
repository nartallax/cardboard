import {ConstBoxImpl, ArrayContext} from "src/internal"

export class ConstArrayContext<E, K> implements ArrayContext<E, K, ConstBoxImpl<E>> {

	private boxMap: Map<K, ConstBoxImpl<E>> | null = null
	private boxArray: ConstBoxImpl<E>[] | null = null

	constructor(private readonly upstream: ConstBoxImpl<readonly E[]>, private readonly getKey: (item: E, index: number) => K) {}

	getBoxForKey(key: K): ConstBoxImpl<E> {
		if(!this.boxMap){
			this.boxMap = new Map()
			const upstreamArray = this.upstream.get()
			for(let i = 0; i < upstreamArray.length; i++){
				const item = upstreamArray[i]!
				const key = this.getKey(item, i)
				if(this.boxMap.has(key)){
					throw new Error("Duplicate array key: " + key)
				}
				this.boxMap.set(key, new ConstBoxImpl(item))
			}
		}

		const box = this.boxMap.get(key)
		if(!box){
			throw new Error("No box for key " + key)
		}

		return box
	}

	getBoxes(): ConstBoxImpl<E>[] {
		if(!this.boxArray){
			const upstreamArray = this.upstream.get()
			this.boxArray = upstreamArray.map(item => new ConstBoxImpl(item))
		}
		return [...this.boxArray]
	}

}