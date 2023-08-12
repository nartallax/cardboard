import {Subscription, UpdateReceiver, MapBox, Update, ViewBox} from "src/internal"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type NTuple<X, T> = X extends `${infer _}${infer B}` ? [T, ...NTuple<B, T>] : []
type SubQueue<T> = Map<Subscription<T>, Update<T>>

class UpdateQueue {
	private readonly subQueues = new Array(4).fill(null).map(() => new Map()) as NTuple<"1234", SubQueue<unknown>>
	private isRunning = false
	private pauseLevel = 0

	private getSubQueue<T>(receiver: UpdateReceiver<T>): SubQueue<T> {
		// this exact ordering of update distribution is dictated by the need to avoid showing inconsistent state to user callbacks
		if(typeof(receiver) === "function"){
			return this.subQueues[3] as SubQueue<T>
		} else if(receiver instanceof ViewBox){
			return this.subQueues[2] as SubQueue<T>
		} else if(receiver instanceof MapBox){
			return this.subQueues[1] as SubQueue<T>
		} else {
			return this.subQueues[0] as SubQueue<T>
		}
	}

	withUpdatesPaused<T>(callback: () => T): T {
		this.pauseLevel++
		try {
			return callback()
		} finally {
			this.pauseLevel--
			this.run()
		}
	}

	enqueueUpdate<T>(update: Update<T>): void {
		const subQueue = this.getSubQueue(update.subscription.receiver)
		const oldUpdate = subQueue.get(update.subscription)
		if(oldUpdate){
			// we cannot have two updates queued at the same time, because it doesn't make sense to in general
			// so, when we queue next update, previous update is lost
			// that means that we MUST do full update, because if both of the updates are partial - some meaning is lost
			// and that's why we are clearing meta here
			update.meta = undefined
		}
		if(update.value === update.subscription.lastKnownValue){
			subQueue.delete(update.subscription)
		} else {
			subQueue.set(update.subscription, update)
		}
	}

	deleteUpdate<T>(subscription: Subscription<T>): void {
		this.getSubQueue(subscription.receiver).delete(subscription)
	}

	run(): void {
		if(this.isRunning || this.pauseLevel > 0){
			return
		}
		this.isRunning = true
		try {
			this.runInternal()
		} finally {
			this.isRunning = false
		}
	}

	private runInternal(): void {
		while(true){
			for(let i = 0; i < this.subQueues.length; i++){
				const subQueue = this.subQueues[i]!
				const update = subQueue.values().next().value as Update<unknown> | undefined
				if(!update){
					if(i === this.subQueues.length - 1){
						return
					}
					continue
				}

				subQueue.delete(update.subscription)
				update.deliver()
				break
			}
		}
	}

}

export const updateQueue = new UpdateQueue()