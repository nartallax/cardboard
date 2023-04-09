export function anythingToString(x: unknown): string {
	if(typeof(x) === "symbol"){
		return x.toString()
	} else {
		return x + ""
	}
}

/** This function extracts combined prototype from a class and all of its superclasses.
 * Fields are also extracted into prototype.
 * This prototype can later be used in `Object.setPrototypeOf(someFunction, myPrototype)`
 *
 * This is a way to have our source code in form of classes,
 * but we can't have them like that in runtime, because class can only produce an object as its instance
 * So we extract prototype from class and then assign that prototype to a function, which is okay
 *
 * This approach has its limitations, like:
 * 		we cannot have constructors (they won't be invoked)
 * 		we cannot have non-trivial values as default values of class fields (we should not share them)
 * 		we cannot have getters/setters on our classes
 * those approaches largely shape how classes code is written. */
export function extractCombinedPrototype<T>(cls: {new(): T}): CombinedPrototype<T> {
	const instance = new cls()
	const result: Record<string, unknown> = {}

	// this will probably be some well-known value, like `Object` itself
	// but I can't be bothered to check, and this will work as well
	const rootObjectProto = Object.getPrototypeOf({})

	function extractFrom(obj: Record<string, unknown>): void {
		for(const key in Object.getOwnPropertyDescriptors(obj)){
			if(Object.hasOwn(result, key)){
				// lower item in prototype chain already overwrote this value
				continue
			}

			const value = obj[key]
			if(value !== null && typeof(value) === "object"){
				throw new Error("You really should not put non-trivial values in prototype; key is " + key + ", value is " + value)
			}

			result[key] = value
		}
		const proto = Object.getPrototypeOf(obj)
		if(proto && proto !== rootObjectProto){
			extractFrom(proto)
		}
	}

	extractFrom(instance as Record<string, unknown>)
	result.name = cls.name
	return result as CombinedPrototype<T>
}

/** A prototype extracted from a class. */
export type CombinedPrototype<T> = Record<keyof T, unknown>