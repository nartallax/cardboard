import type {DependencyList, RBox} from "src/new/internal"

/** This class allows non-trivial boxes to gather information on which boxes they depend on */
export class NotificationStack {

	private stack: DependencyList[] = []
	private stackSet: Set<DependencyList> = new Set()

	withNotifications<T>(depList: DependencyList, fn: () => T): T {
		if(this.stackSet.has(depList)){
			throw new Error("Circular dependency detected in box calculations")
		}
		this.stackSet.add(depList)
		this.stack.push(depList)
		try {
			return fn()
		} finally {
			this.stackSet.delete(depList)
			this.stack.pop()
		}
	}

	notify<T>(box: RBox<T>, value: T): void {
		const stackTop = this.stack[this.stack.length - 1]
		if(stackTop && !stackTop.isStatic){
			stackTop.notifyDependencyCall(box, value)
		}
	}

}