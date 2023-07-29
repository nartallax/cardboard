import {ConstBox} from "src/internal"
import {ArrayContext} from "src/types"

export class ConstArrayContext<E, K> implements ArrayContext<E, K, ConstBox<E>> {

	private boxMap: Map<K, ConstBox<E>> | null = null
	private boxArray: ConstBox<E>[] | null = null

	constructor(private readonly upstream: ConstBox<E[]>, private readonly getKey: (item: E, index: number) => K) {}

	getBoxForKey(key: K): ConstBox<E> {
		if(!this.boxMap){
			this.boxMap = new Map()
			const upstreamArray = this.upstream.get()
			for(let i = 0; i < upstreamArray.length; i++){
				const item = upstreamArray[i]!
				const key = this.getKey(item, i)
				if(this.boxMap.has(key)){
					throw new Error("Duplicate array key: " + key)
				}
				this.boxMap.set(key, new ConstBox(item))
			}
		}

		const box = this.boxMap.get(key)
		if(!box){
			throw new Error("No box for key " + key)
		}

		return box
	}

	getBoxes(): ConstBox<E>[] {
		if(!this.boxArray){
			const upstreamArray = this.upstream.get()
			this.boxArray = upstreamArray.map(item => new ConstBox(item))
		}
		return [...this.boxArray]
	}

}