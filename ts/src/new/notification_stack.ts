import type {DependencyList, DownstreamBox, RBoxInternal} from "src/new/internal"

/** This class allows non-trivial boxes to gather information on which boxes they depend on */
class NotificationStack {

	private stack: DependencyList[] = []
	private stackSet: Set<DependencyList> = new Set()

	calculateWithNotifications<T>(box: DownstreamBox<T>): T {
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

	notify<T>(box: RBoxInternal<T>, value: T): void {
		const stackTop = this.stack[this.stack.length - 1]
		if(stackTop && !stackTop.isStatic){
			stackTop.notifyDependencyCall(box, value)
		}
	}

}

export const notificationStack = new NotificationStack()