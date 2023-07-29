import type {DependencyList, DownstreamBoxImpl, BoxInternal} from "src/new/internal"

/** This class allows non-trivial boxes to gather information on which boxes they depend on */
class NotificationStack {

	private stack: (DependencyList | null)[] = []
	private stackSet: Set<DependencyList> = new Set()

	calculateWithNotifications<T>(box: DownstreamBoxImpl<T>): T {
		const depList = box.dependencyList
		if(this.stackSet.has(depList)){
			throw new Error("Circular dependency detected in box calculations")
		}
		this.stackSet.add(depList)
		this.stack.push(depList)
		try {
			return box.calculate()
		} finally {
			this.stackSet.delete(depList)
			this.stack.pop()
		}
	}

	/** Get value of the box, but prevent notifications to other boxes about this value being get
	 *
	 * This is useful if a box depends on value of other box */
	getWithoutNotifications<T>(box: BoxInternal<T>): T {
		this.stack.push(null)
		try {
			return box.get()
		} finally {
			this.stack.pop()
		}
	}

	notify<T>(box: BoxInternal<T>, value: T): void {
		const stackTop = this.stack[this.stack.length - 1]
		if(stackTop && !stackTop.isStatic){
			stackTop.notifyDependencyCall(box, value)
		}
	}

}

export const notificationStack = new NotificationStack()