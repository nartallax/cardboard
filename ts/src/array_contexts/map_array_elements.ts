import {BoxInternal, RBox, WBox} from "src/types"

export function mapArrayElements<E, R>(upstream: BoxInternal<readonly E[]>, mapper: (item: E, index: number) => R, reverseMapper?: (item: R, index: number) => E): RBox<R[]> | WBox<R[]> {
	const forwardCache = new Map<E, R>()
	const backwardCache: Map<R, E> | null = !reverseMapper ? null : new Map()

	const forwardMap = (upstreamValues: readonly E[]) => {
		const outdatedUpstreamItems = new Set(forwardCache.keys())
		const result = upstreamValues.map((upstreamItem, index) => {
			outdatedUpstreamItems.delete(upstreamItem)
			let downstreamItem = forwardCache.get(upstreamItem)
			if(!downstreamItem){
				downstreamItem = mapper(upstreamItem, index)
				forwardCache.set(upstreamItem, downstreamItem)
				if(backwardCache){
					backwardCache.set(downstreamItem, upstreamItem)
				}
			}
			return downstreamItem
		})
		if(backwardCache){
			for(const outdatedItem of outdatedUpstreamItems){
				backwardCache.delete(forwardCache.get(outdatedItem)!)
			}
		}
		for(const outdatedItem of outdatedUpstreamItems){
			forwardCache.delete(outdatedItem)
		}
		return result
	}

	if(!backwardCache || !reverseMapper){
		return upstream.map(forwardMap)
	}

	const backwardMap = (downstreamValues: R[]) => {
		const outdatedDownstreamItems = new Set(backwardCache.keys())
		const result = downstreamValues.map((downstreamItem, index) => {
			outdatedDownstreamItems.delete(downstreamItem)
			let upstreamItem = backwardCache.get(downstreamItem)
			if(!upstreamItem){
				upstreamItem = reverseMapper(downstreamItem, index)
				forwardCache.set(upstreamItem, downstreamItem)
				backwardCache.set(downstreamItem, upstreamItem)
			}
			return upstreamItem
		})
		for(const outdatedItem of outdatedDownstreamItems){
			forwardCache.delete(backwardCache.get(outdatedItem)!)
			backwardCache.delete(outdatedItem)
		}
		return result
	}
	return upstream.map(forwardMap, backwardMap)
}

