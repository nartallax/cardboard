import {describe, test} from "@nartallax/clamsensor"
import {BoxInternal, box, constBox, isArrayItemWBox, isConstBox, isRBox, isWBox, unbox, calcBox} from "src/internal"
import expect from "expect.js"
import {makeCallCounter} from "test/test_utils"

describe("ArrayItemBox", () => {
	test("isRBox", () => {
		expect(isRBox(box([1]).getArrayContext(e => e).getBoxes()[0])).to.be(true)
		expect(isRBox(calcBox([], () => [1]).getArrayContext(e => e).getBoxes()[0])).to.be(true)
		expect(isRBox(constBox([1]).getArrayContext(e => e).getBoxes()[0])).to.be(true)
	})

	test("isWBox", () => {
		expect(isWBox(box([1]).getArrayContext(e => e).getBoxes()[0])).to.be(true)
		expect(isWBox(calcBox([], () => [1]).getArrayContext(e => e).getBoxes()[0])).to.be(false)
		expect(isWBox(constBox([1]).getArrayContext(e => e).getBoxes()[0])).to.be(false)
	})

	test("isConstBox", () => {
		expect(isConstBox(box([1]).getArrayContext(e => e).getBoxes()[0])).to.be(false)
		expect(isConstBox(calcBox([], () => [1]).getArrayContext(e => e).getBoxes()[0])).to.be(false)
		expect(isConstBox(constBox([1]).getArrayContext(e => e).getBoxes()[0])).to.be(true)
	})

	test("isArrayItemWBox", () => {
		expect(isArrayItemWBox(box(1))).to.be(false)
		expect(isArrayItemWBox(calcBox([], () => 1))).to.be(false)
		expect(isArrayItemWBox(constBox(1))).to.be(false)
		expect(isArrayItemWBox(box({a: 1}).prop("a"))).to.be(false)
		expect(isArrayItemWBox(box({a: 1}).map(x => x.a))).to.be(false)
		expect(isArrayItemWBox(box([1]).getArrayContext(x => x).getBoxForKey(1))).to.be(true)
	})

	test("unbox", () => {
		expect(unbox(box([1]).getArrayContext(e => e).getBoxes()[0])).to.be(1)
		expect(unbox(calcBox([], () => [1]).getArrayContext(e => e).getBoxes()[0])).to.be(1)
		expect(unbox(constBox([1]).getArrayContext(e => e).getBoxes()[0])).to.be(1)
	})

	test("toString", () => {
		expect(box([1]).getArrayContext(e => e).getBoxes()[0] + "").to.be("ArrayItemBox(1, 1)")
		expect(calcBox([], () => [1]).getArrayContext(e => e).getBoxes()[0] + "").to.be("ArrayItemBox(1, 1)")
		expect(constBox([1]).getArrayContext(e => e).getBoxes()[0] + "").to.be("ConstBox(1)")
	})

	test("array items without subscribers", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}])
		const parentInternal = parent as unknown as BoxInternal<readonly {id: number, name: string}[]>
		const context = parent.getArrayContext(x => x.id)
		const box1 = context.getBoxes()[0]!
		const box2 = context.getBoxes()[1]!

		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(box1.get().name).to.be.equal("1")
		expect(box2.get().name).to.be.equal("2")

		parent.set([parent.get()[0]!, {id: 2, name: "22"}])
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(box1.get().name).to.be.equal("1")
		expect(box2.get().name).to.be.equal("22")

		parent.set([{id: 3, name: "3"}, parent.get()[0]!, {id: 2, name: "222"}])
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(box1.get().name).to.be.equal("1")
		expect(box2.get().name).to.be.equal("222")

		parent.set([parent.get()[0]!, parent.get()[2]!])
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(() => box1.get()).to.throwError(/This array-linked box ArrayItemBox\(1, Symbol\(AbsentBoxValue\)\) is no longer attached/i)
		expect(() => box1.set({id: 5, name: "5"})).to.throwError(/This array-linked box ArrayItemBox\(1, Symbol\(AbsentBoxValue\)\) is no longer attached/i)
		expect(parent.get().length).to.be.equal(2)
	})

	test("array items with duplicate keys will throw", () => {
		{
			const parent = box([{id: 1, name: "1"}, {id: 1, name: "2"}])
			const context = parent.getArrayContext(el => el.id)
			expect(() => context.getBoxes()).to.throwError(/key is not unique: 1/i)
		}

		{
			const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}])
			const context = parent.getArrayContext(el => el.id)
			void context.getBoxes() // won't throw yet

			parent.set([{id: 1, name: "1"}, {id: 1, name: "2"}])
			expect(() => context.getBoxes()).to.throwError(/key is not unique: 1/i)
		}
	})

	test("array items with subscribers", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}])
		const parentInternal = parent as unknown as BoxInternal<readonly {id: number, name: string}[]>
		const context = parent.getArrayContext(x => x.id)
		const box1 = context.getBoxes()[0]!
		const box2 = context.getBoxes()[1]!

		const counter = makeCallCounter()
		box2.subscribe(counter)
		expect(parentInternal.haveSubscribers()).to.be.equal(true)

		expect(box1.get().name).to.be.equal("1")
		expect(box2.get().name).to.be.equal("2")

		parent.set([parent.get()[0]!, {id: 2, name: "22"}])
		expect(box1.get().name).to.be.equal("1")
		expect(box2.get().name).to.be.equal("22")
		expect(box2.get()).to.be.equal(counter.lastCallValue)
		expect(counter.callCount).to.be.equal(1)

		parent.set([{id: 3, name: "3"}, parent.get()[0]!, {id: 2, name: "222"}])
		expect(box1.get().name).to.be.equal("1")
		expect(box2.get().name).to.be.equal("222")
		expect(box2.get()).to.be.equal(counter.lastCallValue)
		expect(counter.callCount).to.be.equal(2)

		parent.set([parent.get()[0]!, parent.get()[2]!])
		expect(box2.get().name).to.be.equal("222")
		expect(box2.get()).to.be.equal(counter.lastCallValue)
		expect(counter.callCount).to.be.equal(2)
		expect(() => box1.get()).to.throwError(/This array-linked box ArrayItemBox\(1, Symbol\(AbsentBoxValue\)\) is no longer attached/i)
		expect(() => box1.set({id: 5, name: "5"})).to.throwError(/This array-linked box ArrayItemBox\(1, Symbol\(AbsentBoxValue\)\) is no longer attached/i)
		expect(parent.get().length).to.be.equal(2)

		box2.unsubscribe(counter)
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
	})

	test("chain array items without subscribers", () => {
		const parent = box([[{id: 1, name: "1"}, {id: 2, name: "2"}], [{id: 3, name: "3"}]])
		const parentInternal = parent as unknown as BoxInternal<readonly {id: number, name: string}[][]>
		const contextA = parent.getArrayContext(arr => arr.length)
		const contextB = contextA.getBoxForKey(2).getArrayContext(el => el.id)
		const box1 = contextB.getBoxForKey(1)

		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(box1.get().name).to.be.equal("1")

		parent.set([[{id: 1, name: "11"}, parent.get()[0]![1]!], parent.get()[1]!])
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(box1.get().name).to.be.equal("11")

		box1.set({id: 1, name: "owo"})
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(box1.get().name).to.be.equal("owo")
		expect(parent.get()[0]![0]!.name).to.be.equal("owo")

		parent.set([parent.get()[1]!, parent.get()[0]!])
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(box1.get().name).to.be.equal("owo")
		expect(box1.get()).to.be.equal(parent.get()[1]![0]!)

		parent.set([parent.get()[0]!, [parent.get()[1]![1]!, parent.get()[1]![0]!]])
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(box1.get().name).to.be.equal("owo")
		expect(box1.get()).to.be.equal(parent.get()[1]![1]!)

		parent.set([parent.get()[0]!, [parent.get()[1]![0]!]])
		// that's about array
		expect(() => box1.get()).to.throwError(/key is not unique: 1/i)

		parent.set([parent.get()[0]!, [parent.get()[1]![0]!, {id: 12345, name: "nya"}]])
		expect(() => box1.get()).to.throwError(/This array-linked box ArrayItemBox\(1, Symbol\(AbsentBoxValue\)\) is no longer attached/i)
	})

	test("chain array items with subscribers", () => {
		const parent = box([[{id: 1, name: "1"}, {id: 2, name: "2"}], [{id: 3, name: "3"}]])
		const parentInternal = parent as unknown as BoxInternal<readonly {id: number, name: string}[][]>
		const contextA = parent.getArrayContext(arr => arr.length)
		const contextB = contextA.getBoxForKey(2).getArrayContext(el => el.id)
		const box1 = contextB.getBoxForKey(1)

		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(box1.get().name).to.be.equal("1")

		const counter = makeCallCounter()
		box1.subscribe(counter)

		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		parent.set([[{id: 1, name: "11"}, parent.get()[0]![1]!], parent.get()[1]!])
		expect(box1.get().name).to.be.equal("11")
		expect(counter.callCount).to.be.equal(1)
		expect(counter.lastCallValue).to.be.equal(box1.get())
		expect(counter.lastCallValue).to.be.equal(parent.get()[0]![0]!)

		box1.set({id: 1, name: "owo"})
		expect(box1.get().name).to.be.equal("owo")
		expect(parent.get()[0]![0]!.name).to.be.equal("owo")
		expect(counter.callCount).to.be.equal(2)
		expect(counter.lastCallValue).to.be.equal(box1.get())

		parent.set([parent.get()[1]!, parent.get()[0]!])
		expect(box1.get().name).to.be.equal("owo")
		expect(box1.get()).to.be.equal(parent.get()[1]![0]!)
		expect(counter.callCount).to.be.equal(2)
		expect(counter.lastCallValue).to.be.equal(box1.get())

		parent.set([parent.get()[0]!, [parent.get()[1]![1]!, parent.get()[1]![0]!]])
		expect(box1.get().name).to.be.equal("owo")
		expect(box1.get()).to.be.equal(parent.get()[1]![1]!)
		expect(counter.callCount).to.be.equal(2)
		expect(counter.lastCallValue).to.be.equal(box1.get())

		box1.unsubscribe(counter)
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(box1.get().name).to.be.equal("owo")
		expect(counter.lastCallValue).to.be.equal(box1.get())
		expect(counter.lastCallValue).to.be.equal(parent.get()[1]![1]!)
	})

	test("chain array items with subscribers throw 1", () => {
		const parent = box([[{id: 1, name: "1"}, {id: 2, name: "2"}], [{id: 3, name: "3"}]])
		const parentInternal = parent as unknown as BoxInternal<readonly {id: number, name: string}[][]>
		const contextA = parent.getArrayContext(arr => arr.length)
		const contextB = contextA.getBoxForKey(2).getArrayContext(el => el.id)
		const box1 = contextB.getBoxForKey(1)

		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(box1.get().name).to.be.equal("1")

		const counter = makeCallCounter()
		box1.subscribe(counter)

		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		parent.set([[{id: 1, name: "11"}, parent.get()[0]![1]!], parent.get()[1]!])
		expect(box1.get().name).to.be.equal("11")
		expect(counter.callCount).to.be.equal(1)
		expect(counter.lastCallValue).to.be.equal(box1.get())
		expect(counter.lastCallValue).to.be.equal(parent.get()[0]![0]!)

		box1.set({id: 1, name: "owo"})
		expect(box1.get().name).to.be.equal("owo")
		expect(parent.get()[0]![0]!.name).to.be.equal("owo")
		expect(counter.callCount).to.be.equal(2)
		expect(counter.lastCallValue).to.be.equal(box1.get())

		parent.set([parent.get()[1]!, parent.get()[0]!])
		expect(box1.get().name).to.be.equal("owo")
		expect(box1.get()).to.be.equal(parent.get()[1]![0]!)
		expect(counter.callCount).to.be.equal(2)
		expect(counter.lastCallValue).to.be.equal(box1.get())

		parent.set([parent.get()[0]!, [parent.get()[1]![1]!, parent.get()[1]![0]!]])
		expect(box1.get().name).to.be.equal("owo")
		expect(box1.get()).to.be.equal(parent.get()[1]![1]!)
		expect(counter.callCount).to.be.equal(2)
		expect(counter.lastCallValue).to.be.equal(box1.get())

		// that's about array
		expect(() => parent.set([parent.get()[0]!, [parent.get()[1]![0]!]])).to.throwError(/key is not unique: 1/i)
	})

	test("chain array item with subscribers throw 2", () => {
		const parent = box([[{id: 1, name: "1"}, {id: 2, name: "2"}], [{id: 3, name: "3"}]])
		const parentInternal = parent as unknown as BoxInternal<readonly {id: number, name: string}[][]>
		const contextA = parent.getArrayContext(arr => arr.length)
		const contextB = contextA.getBoxForKey(2).getArrayContext(el => el.id)
		const box1 = contextB.getBoxForKey(1)

		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(box1.get().name).to.be.equal("1")

		const counter = makeCallCounter()
		box1.subscribe(counter)

		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		parent.set([[{id: 1, name: "11"}, parent.get()[0]![1]!], parent.get()[1]!])
		expect(box1.get().name).to.be.equal("11")
		expect(counter.callCount).to.be.equal(1)
		expect(counter.lastCallValue).to.be.equal(box1.get())
		expect(counter.lastCallValue).to.be.equal(parent.get()[0]![0]!)

		box1.set({id: 1, name: "owo"})
		expect(box1.get().name).to.be.equal("owo")
		expect(parent.get()[0]![0]!.name).to.be.equal("owo")
		expect(counter.callCount).to.be.equal(2)
		expect(counter.lastCallValue).to.be.equal(box1.get())

		parent.set([parent.get()[1]!, parent.get()[0]!])
		expect(box1.get().name).to.be.equal("owo")
		expect(box1.get()).to.be.equal(parent.get()[1]![0]!)
		expect(counter.callCount).to.be.equal(2)
		expect(counter.lastCallValue).to.be.equal(box1.get())

		parent.set([parent.get()[0]!, [parent.get()[1]![1]!, parent.get()[1]![0]!]])
		expect(box1.get().name).to.be.equal("owo")
		expect(box1.get()).to.be.equal(parent.get()[1]![1]!)
		expect(counter.callCount).to.be.equal(2)
		expect(counter.lastCallValue).to.be.equal(box1.get())

		parent.set([parent.get()[0]!, [parent.get()[1]![0]!, {id: 12345, name: "nya"}]])
		expect(counter.callCount).to.be.equal(2)
		expect(() => box1.get()).to.throwError(/This array-linked box ArrayItemBox\(1, Symbol\(AbsentBoxValue\)\) is no longer attached/i)
	})

	test("chain array wraps with subscribers throw 3", () => {
		const parent = box([[{id: 1, name: "1"}, {id: 2, name: "2"}], [{id: 3, name: "3"}]])
		const parentInternal = parent as unknown as BoxInternal<{id: number, name: string}[][]>
		const contextA = parent.getArrayContext(arr => arr.length)
		const contextB = contextA.getBoxForKey(2).getArrayContext(el => el.id)
		const box1 = contextB.getBoxForKey(1)

		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(box1.get().name).to.be.equal("1")

		box1.subscribe(() => {
			// nothing
		})

		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		parent.set([])
		expect(() => box1.get()).to.throwError(/This array-linked box ArrayItemBox\(2, Symbol\(AbsentBoxValue\)\) is no longer attached/i)
	})

	test("prop and arraywrap chain with subscribers", () => {
		const parent = box({a: [{id: 5, name: "5"}, {id: 6, name: "6"}]})
		const parentInternal = parent as unknown as BoxInternal<{a: {id: number, name: string}[]}>
		const prop = parent.prop("a")
		const context = prop.getArrayContext(el => el.id)
		const box6 = context.getBoxes()[1]!

		expect(parentInternal.haveSubscribers()).to.be.equal(false)

		const counter = makeCallCounter()
		box6.subscribe(counter)

		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		expect(box6.get().name).to.be.equal("6")
		expect(counter.callCount).to.be.equal(0)

		box6.set({id: 6, name: "66"})
		expect(box6.get().name).to.be.equal("66")
		expect(counter.lastCallValue).to.be.equal(box6.get())
		expect(parent.get().a[1]).to.be.equal(box6.get())
		expect(counter.callCount).to.be.equal(1)

		parent.set({a: [{id: 7, name: "owo"}, {id: 5, name: "uwu"}]})
		expect(() => box6.get()).to.throwError(/This array-linked box ArrayItemBox\(6, Symbol\(AbsentBoxValue\)\) is no longer attached/i)
		expect(counter.callCount).to.be.equal(1)

		box6.unsubscribe(counter)
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
	})

	test("arraywrap and prop test chain no sub", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}])
		const parentInternal = parent as unknown as BoxInternal<{id: number, name: string}[]>
		const context = parent.getArrayContext(el => el.id)
		const prop = context.getBoxes()[1]!.prop("name")

		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(prop.get()).to.be.equal("2")

		prop.set("22")
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(prop.get()).to.be.equal("22")
		expect(parent.get()[1]!.name).to.be.equal(prop.get())

		parent.set([parent.get()[1]!, parent.get()[0]!])
		expect(prop.get()).to.be.equal("22")
		expect(parent.get()[0]!.name).to.be.equal(prop.get())

		prop.set("222")
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(prop.get()).to.be.equal("222")
		expect(parent.get()[0]!.name).to.be.equal(prop.get())

		parent.set([{id: 2, name: "uwu"}, parent.get()[1]!])
		expect(prop.get()).to.be.equal("uwu")
		expect(parent.get()[0]!.name).to.be.equal(prop.get())
	})

	test("arraywrap and prop test chain with sub", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}])
		const parentInternal = parent as unknown as BoxInternal<{id: number, name: string}[]>
		const context = parent.getArrayContext(el => el.id)
		const prop = context.getBoxes()[1]!.prop("name")

		expect(parentInternal.haveSubscribers()).to.be.equal(false)

		const counter = makeCallCounter()
		prop.subscribe(counter)

		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		expect(prop.get()).to.be.equal("2")
		expect(counter.callCount).to.be.equal(0)

		prop.set("22")
		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		expect(prop.get()).to.be.equal("22")
		expect(parent.get()[1]!.name).to.be.equal(prop.get())
		expect(counter.lastCallValue).to.be.equal(prop.get())
		expect(counter.callCount).to.be.equal(1)

		parent.set([parent.get()[1]!, parent.get()[0]!])
		expect(prop.get()).to.be.equal("22")
		expect(parent.get()[0]!.name).to.be.equal(prop.get())
		expect(counter.lastCallValue).to.be.equal(prop.get())
		expect(counter.callCount).to.be.equal(1)

		prop.set("222")
		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		expect(prop.get()).to.be.equal("222")
		expect(parent.get()[0]!.name).to.be.equal(prop.get())
		expect(counter.lastCallValue).to.be.equal(prop.get())
		expect(counter.callCount).to.be.equal(2)

		parent.set([{id: 2, name: "uwu"}, parent.get()[1]!])
		expect(prop.get()).to.be.equal("uwu")
		expect(parent.get()[0]!.name).to.be.equal(prop.get())
		expect(counter.lastCallValue).to.be.equal(prop.get())
		expect(counter.callCount).to.be.equal(3)

		prop.unsubscribe(counter)
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
	})

	test("arraywrap and calcbox chain no sub", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}])
		const parentInternal = parent as unknown as BoxInternal<{id: number, name: string}[]>
		const context = parent.getArrayContext(el => el.id)
		const box1 = context.getBoxes()[0]!
		const calc1 = calcBox([box1], b1 => b1.name + ", nya")

		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(calc1.get()).to.be.equal("1, nya")
		expect(parent.get()[0]!.name).to.be.equal("1")

		parent.set([{id: 1, name: "11"}, parent.get()[1]!])
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(calc1.get()).to.be.equal("11, nya")
		expect(parent.get()[0]!.name).to.be.equal("11")

		parent.set([parent.get()[1]!, {id: 1, name: "11"}])
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(calc1.get()).to.be.equal("11, nya")
		expect(parent.get()[1]!.name).to.be.equal("11")

		parent.set([parent.get()[0]!])
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(() => calc1.get()).to.throwError(/This array-linked box ArrayItemBox\(1, Symbol\(AbsentBoxValue\)\) is no longer attached/i)
	})

	test("arraywrap and calcbox chain with sub", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}])
		const parentInternal = parent as unknown as BoxInternal<{id: number, name: string}[]>
		const context = parent.getArrayContext(el => el.id)
		const box1 = context.getBoxes()[0]!
		const calc1 = calcBox([box1], b1 => b1.name + ", nya")

		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		const counter = makeCallCounter()
		calc1.subscribe(counter)

		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		expect(calc1.get()).to.be.equal("1, nya")
		expect(parent.get()[0]!.name).to.be.equal("1")
		expect(counter.callCount).to.be.equal(0)

		parent.set([{id: 1, name: "11"}, parent.get()[1]!])
		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		expect(calc1.get()).to.be.equal("11, nya")
		expect(parent.get()[0]!.name).to.be.equal("11")
		expect(counter.lastCallValue).to.be.equal(calc1.get())
		expect(counter.callCount).to.be.equal(1)

		parent.set([parent.get()[1]!, {id: 1, name: "11"}])
		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		expect(calc1.get()).to.be.equal("11, nya")
		expect(parent.get()[1]!.name).to.be.equal("11")
		expect(counter.lastCallValue).to.be.equal(calc1.get())
		expect(counter.callCount).to.be.equal(1)

		calc1.unsubscribe(counter)
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(calc1.get()).to.be.equal("11, nya")
		expect(counter.callCount).to.be.equal(1)
	})

	test("arraywrap and calcbox chain with sub different throw", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}])
		const parentInternal = parent as unknown as BoxInternal<{id: number, name: string}[]>
		const context = parent.getArrayContext(el => el.id)
		const box1 = context.getBoxes()[0]!
		const calc1 = calcBox([box1], b1 => b1.name + ", nya")

		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		const counter = makeCallCounter()
		calc1.subscribe(counter)

		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		expect(calc1.get()).to.be.equal("1, nya")
		expect(parent.get()[0]!.name).to.be.equal("1")
		expect(counter.callCount).to.be.equal(0)

		parent.set([{id: 1, name: "11"}, parent.get()[1]!])
		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		expect(calc1.get()).to.be.equal("11, nya")
		expect(parent.get()[0]!.name).to.be.equal("11")
		expect(counter.lastCallValue).to.be.equal(calc1.get())
		expect(counter.callCount).to.be.equal(1)

		parent.set([parent.get()[1]!, {id: 1, name: "11"}])
		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		expect(calc1.get()).to.be.equal("11, nya")
		expect(parent.get()[1]!.name).to.be.equal("11")
		expect(counter.lastCallValue).to.be.equal(calc1.get())
		expect(counter.callCount).to.be.equal(1)

		parent.set([parent.get()[0]!])
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(() => calc1.get()).to.throwError(/This array-linked box ArrayItemBox\(1, Symbol\(AbsentBoxValue\)\) is no longer attached/i)
		expect(counter.callCount).to.be.equal(1)
	})

	test("calcbox and arraywrap chain no sub", () => {
		const parent = box({a: [{id: 1, name: "1"}]})
		const parentInternal = parent as unknown as BoxInternal<{a: {id: number, name: string}[]}>
		const calc = calcBox([parent], parent => parent.a)
		const context = calc.getArrayContext(el => el.id)
		const box1 = context.getBoxes()[0]!

		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(box1.get().name).to.be.equal("1")
		expect(box1.get()).to.be.equal(parent.get().a[0])

		parent.set({a: [{id: 1, name: "11"}]})
		expect(box1.get().name).to.be.equal("11")
		expect(box1.get()).to.be.equal(parent.get().a[0])
		expect(parentInternal.haveSubscribers()).to.be.equal(false)

		const prop = parent.prop("a")
		prop.set([{id: 1, name: "111"}])
		expect(box1.get().name).to.be.equal("111")
		expect(box1.get()).to.be.equal(parent.get().a[0])
		expect(parentInternal.haveSubscribers()).to.be.equal(false)

		prop.set([{id: 2, name: "2"}])
		expect(() => box1.get()).to.throwError(/This array-linked box ArrayItemBox\(1, Symbol\(AbsentBoxValue\)\) is no longer attached/i)
	})

	test("calcbox and arraywrap chain with sub", () => {
		const parent = box({a: [{id: 1, name: "1"}]})
		const parentInternal = parent as unknown as BoxInternal<{a: {id: number, name: string}[]}>
		const calc = calcBox([parent], parent => parent.a)
		const context = calc.getArrayContext(el => el.id)
		const box1 = context.getBoxes()[0]!

		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(box1.get().name).to.be.equal("1")
		expect(box1.get()).to.be.equal(parent.get().a[0])

		const counter = makeCallCounter()
		box1.subscribe(counter)

		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		parent.set({a: [{id: 1, name: "11"}]})
		expect(box1.get().name).to.be.equal("11")
		expect(box1.get()).to.be.equal(parent.get().a[0])
		expect(counter.lastCallValue).to.be.equal(box1.get())
		expect(counter.callCount).to.be.equal(1)

		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		const prop = parent.prop("a")
		prop.set([{id: 1, name: "111"}])
		expect(box1.get().name).to.be.equal("111")
		expect(box1.get()).to.be.equal(parent.get().a[0])
		expect(counter.lastCallValue).to.be.equal(box1.get())
		expect(counter.callCount).to.be.equal(2)

		box1.unsubscribe(counter)
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(box1.get().name).to.be.equal("111")
		expect(box1.get()).to.be.equal(parent.get().a[0])
		expect(counter.lastCallValue).to.be.equal(box1.get())
		expect(counter.callCount).to.be.equal(2)
	})

	test("arraywrap of calcbox of arraywrap no sub", () => {
		const parent = box([{a: [{id: 7, name: "1"}], id: 5}])
		const parentInternal = parent as unknown as BoxInternal<{id: number, a: {id: number, name: string}[]}[]>
		const firstContext = parent.getArrayContext(el => el.id)
		const firstContextBox = firstContext.getBoxes()[0]!
		const calc = calcBox([firstContextBox], x => x.a)
		const secondContext = calc.getArrayContext(el => el.id)
		const box1 = secondContext.getBoxes()[0]!

		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(box1.get().name).to.be.equal("1")
		expect(box1.get()).to.be.equal(parent.get()[0]!.a[0])

		parent.set([{a: [{id: 7, name: "2"}], id: 5}])
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(box1.get().name).to.be.equal("2")
		expect(box1.get()).to.be.equal(parent.get()[0]!.a[0])

		firstContextBox.set({a: [{id: 7, name: "3"}], id: 5})
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(box1.get().name).to.be.equal("3")
		expect(box1.get()).to.be.equal(parent.get()[0]!.a[0])

		parent.set([{a: [{id: 7, name: "4"}], id: 6}])
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(() => box1.get()).to.throwError(/This array-linked box ArrayItemBox\(5, Symbol\(AbsentBoxValue\)\) is no longer attached/i)
	})

	test("arraywrap of calcbox of arraywrap with sub", () => {
		const parent = box([{a: [{id: 7, name: "1"}], id: 5}])
		const parentInternal = parent as unknown as BoxInternal<{id: number, a: {id: number, name: string}[]}[]>
		const firstContext = parent.getArrayContext(el => el.id)
		const firstContextBox = firstContext.getBoxes()[0]!
		const calc = calcBox([firstContextBox], x => x.a)
		const secondContext = calc.getArrayContext(el => el.id)
		const box1 = secondContext.getBoxes()[0]!

		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(box1.get().name).to.be.equal("1")
		expect(box1.get()).to.be.equal(parent.get()[0]!.a[0])

		const counter = makeCallCounter()
		box1.subscribe(counter)

		parent.set([{a: [{id: 7, name: "2"}], id: 5}])
		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		expect(box1.get().name).to.be.equal("2")
		expect(box1.get()).to.be.equal(parent.get()[0]!.a[0])
		expect(counter.callCount).to.be.equal(1)
		expect(counter.lastCallValue).to.be.equal(parent.get()[0]!.a[0])

		firstContextBox.set({a: [{id: 7, name: "3"}], id: 5})
		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		expect(box1.get().name).to.be.equal("3")
		expect(box1.get()).to.be.equal(parent.get()[0]!.a[0])
		expect(counter.callCount).to.be.equal(2)
		expect(counter.lastCallValue).to.be.equal(parent.get()[0]!.a[0])

		parent.set([{a: [{id: 7, name: "4"}], id: 6}])
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(counter.callCount).to.be.equal(2)
		expect(counter.lastCallValue.name).to.be.equal("3")
		expect(() => box1.get()).to.throwError(/This array-linked box ArrayItemBox\(5, Symbol\(AbsentBoxValue\)\) is no longer attached/i)
	})

	test("arraywrap of calcbox of arraywrap with sub no throw", () => {
		const parent = box([{a: [{id: 7, name: "1"}], id: 5}])
		const parentInternal = parent as unknown as BoxInternal<{id: number, a: {id: number, name: string}[]}[]>
		const firstContext = parent.getArrayContext(el => el.id)
		const firstContextBox = firstContext.getBoxes()[0]!
		const calc = calcBox([firstContextBox], x => x.a)
		const secondContext = calc.getArrayContext(el => el.id)
		const box1 = secondContext.getBoxes()[0]!

		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(box1.get().name).to.be.equal("1")
		expect(box1.get()).to.be.equal(parent.get()[0]!.a[0])

		const counter = makeCallCounter()
		box1.subscribe(counter)

		parent.set([{a: [{id: 7, name: "2"}], id: 5}])
		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		expect(box1.get().name).to.be.equal("2")
		expect(box1.get()).to.be.equal(parent.get()[0]!.a[0])
		expect(counter.callCount).to.be.equal(1)
		expect(counter.lastCallValue).to.be.equal(parent.get()[0]!.a[0])

		firstContextBox.set({a: [{id: 7, name: "3"}], id: 5})
		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		expect(box1.get().name).to.be.equal("3")
		expect(box1.get()).to.be.equal(parent.get()[0]!.a[0])
		expect(counter.callCount).to.be.equal(2)
		expect(counter.lastCallValue).to.be.equal(parent.get()[0]!.a[0])

		box1.unsubscribe(counter)
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
	})

	test("chain array wraps two updates no tests inbetween", () => {
		const parent = box([[{id: 1, name: "1"}]])
		const contextA = parent.getArrayContext(arr => arr.length)
		const contextB = contextA.getBoxes()[0]!.getArrayContext(el => el.id)
		const box1 = contextB.getBoxes()[0]!

		parent.set([[{id: 1, name: "11"}]])
		parent.set([[{id: 2, name: "111"}]])
		expect(() => box1.get()).to.throwError(/This array-linked box ArrayItemBox\(1, Symbol\(AbsentBoxValue\)\) is no longer attached/i)
	})

	test("calc and arraywrap item", () => {
		const parent = box([{id: 1, name: "1"}])
		const parentInternal = parent as unknown as BoxInternal<{id: number, name: string}[]>
		const calc = calcBox([parent], x => x[0]!)
		const context = parent.getArrayContext(el => el.id)
		const box1 = context.getBoxes()[0]!

		const calcCounter = makeCallCounter()
		calc.subscribe(calcCounter)

		const boxCounter = makeCallCounter()
		box1.subscribe(boxCounter)

		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		expect(box1.get()).to.be.equal(calc.get())
		expect(box1.get().name).to.be.equal("1")

		parent.set([{id: 1, name: "11"}])
		expect(boxCounter.lastCallValue).to.be.equal(calc.get())
		expect(calcCounter.lastCallValue).to.be.equal(box1.get())
		expect(box1.get()).to.be.equal(calc.get())
		expect(box1.get().name).to.be.equal("11")
		expect(boxCounter.callCount).to.be.equal(1)
		expect(calcCounter.callCount).to.be.equal(1)

		box1.set({id: 1, name: "111"})
		expect(boxCounter.lastCallValue).to.be.equal(calc.get())
		expect(calcCounter.lastCallValue).to.be.equal(box1.get())
		expect(box1.get()).to.be.equal(calc.get())
		expect(box1.get().name).to.be.equal("111")
		expect(boxCounter.callCount).to.be.equal(2)
		expect(calcCounter.callCount).to.be.equal(2)

		calc.unsubscribe(calcCounter)
		box1.unsubscribe(boxCounter)
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
	})

	test("arraywrap item and calc", () => {
		const parent = box([{id: 1, name: "1"}])
		const parentInternal = parent as unknown as BoxInternal<{id: number, name: string}[]>
		const context = parent.getArrayContext(el => el.id)
		const box1 = context.getBoxes()[0]!
		const calc = calcBox([parent], x => x[0]!)

		const calcCounter = makeCallCounter()
		calc.subscribe(calcCounter)

		const boxCounter = makeCallCounter()
		box1.subscribe(boxCounter)

		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		expect(box1.get()).to.be.equal(calc.get())
		expect(box1.get().name).to.be.equal("1")

		parent.set([{id: 1, name: "11"}])
		expect(boxCounter.lastCallValue).to.be.equal(calc.get())
		expect(calcCounter.lastCallValue).to.be.equal(box1.get())
		expect(box1.get()).to.be.equal(calc.get())
		expect(box1.get().name).to.be.equal("11")
		expect(boxCounter.callCount).to.be.equal(1)
		expect(calcCounter.callCount).to.be.equal(1)

		box1.set({id: 1, name: "111"})
		expect(boxCounter.lastCallValue).to.be.equal(calc.get())
		expect(calcCounter.lastCallValue).to.be.equal(box1.get())
		expect(box1.get()).to.be.equal(calc.get())
		expect(box1.get().name).to.be.equal("111")
		expect(boxCounter.callCount).to.be.equal(2)
		expect(calcCounter.callCount).to.be.equal(2)

		calc.unsubscribe(calcCounter)
		box1.unsubscribe(boxCounter)
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
	})

	test("arraywrap creates new box", () => {
		const parent = box([{id: 1, name: "1"}])
		const context = parent.getArrayContext(el => el.id)
		parent.subscribe(() => {/* noop*/})
		parent.set([...parent.get(), {id: 2, name: "2"}])
		const box2 = context.getBoxes()[1]!
		box2.subscribe(() => {/* noop*/})
		parent.set([parent.get()[0]!, {id: 2, name: "3"}])
		expect(box2.get().name).to.be.equal("3")
	})

	test("deleteArrayElement method", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}])
		const context = parent.getArrayContext(el => el.id)
		const box1 = context.getBoxForKey(1)

		box1.deleteArrayElement()
		expect(parent.get()).to.eql([{id: 2, name: "2"}])
		expect(() => box1.get()).to.throwError(/no longer attached/)
	})

	test("index is updated on partial insert update", () => {
		const loras = box([{id: "a", value: 5}, {id: "b", value: 6}])
		const mapped = loras.mapArray(x => x.id, x => {
			const result = {
				value: x.get().id + "_" + x.get().value,
				box: x
			}
			x.subscribe(x => result.value = x.id + "_" + x.value)
			return result
		})
		mapped.subscribe(makeCallCounter())

		loras.prependElement({id: "c", value: 7})

		mapped.get()[0]!.box.prop("value").set(8)
		mapped.get()[1]!.box.prop("value").set(9)
		expect(loras.get()).to.eql([{id: "c", value: 8}, {id: "a", value: 9}, {id: "b", value: 6}])
	})

	test("index is updated on partial remove update", () => {
		const loras = box([{id: "a", value: 5}, {id: "b", value: 6}, {id: "c", value: 8}])
		const context = loras.getArrayContext(x => x.id)
		const a = context.getBoxForKey("a")
		const b = context.getBoxForKey("b")
		b.subscribe(makeCallCounter())

		a.deleteArrayElement()
		b.set({id: "b", value: 7})

		expect(loras.get()).to.eql([{id: "b", value: 7}, {id: "c", value: 8}])
	})

	test("index is updated on partial remove update, without subscription", () => {
		const loras = box([{id: "a", value: 5}, {id: "b", value: 6}, {id: "c", value: 8}])
		const context = loras.getArrayContext(x => x.id)
		const a = context.getBoxForKey("a")
		const b = context.getBoxForKey("b")

		a.deleteArrayElement()
		b.set({id: "b", value: 7})

		expect(loras.get()).to.eql([{id: "b", value: 7}, {id: "c", value: 8}])
	})

	test("index is updated after changes were made when box wasn't subscribed to", () => {
		const parent = box([{id: "a", value: 5}, {id: "b", value: 6}, {id: "c", value: 8}])
		const context = parent.getArrayContext(x => x.id)
		const a = context.getBoxForKey("a")
		const b = context.getBoxForKey("b")

		a.deleteArrayElement()
		b.subscribe(makeCallCounter())
		b.set({id: "b", value: 7})

		expect(parent.get()).to.eql([{id: "b", value: 7}, {id: "c", value: 8}])
	})


	test("box is properly disconnected after changes were made when box wasn't subscribed to - get", () => {
		const parent = box([{id: "a", value: 5}, {id: "b", value: 6}, {id: "c", value: 8}])
		const context = parent.getArrayContext(x => x.id)
		const a = context.getBoxForKey("a")
		const b = context.getBoxForKey("b")

		parent.deleteElementAtIndex(0)
		b.subscribe(makeCallCounter())
		b.set({id: "b", value: 7})

		expect(parent.get()).to.eql([{id: "b", value: 7}, {id: "c", value: 8}])
		expect(() => a.get()).to.throwError(/no longer attached/)
	})

	test("box is properly disconnected after changes were made when box wasn't subscribed to - set", () => {
		const parent = box([{id: "a", value: 5}, {id: "b", value: 6}, {id: "c", value: 8}])
		const context = parent.getArrayContext(x => x.id)
		const a = context.getBoxForKey("a")
		const b = context.getBoxForKey("b")

		parent.deleteElementAtIndex(0)
		b.subscribe(makeCallCounter())
		b.set({id: "b", value: 7})

		expect(parent.get()).to.eql([{id: "b", value: 7}, {id: "c", value: 8}])
		expect(() => a.set({id: "a", value: 0})).to.throwError(/no longer attached/)
	})

	test("box is disposed immediately after element is deleted from parent array when not subscribed - get", () => {
		const parent = box([{id: "a", value: 5}])
		const context = parent.getArrayContext(x => x.id)
		const a = context.getBoxForKey("a")
		parent.set([])
		expect(() => a.get()).to.throwError(/no longer attached/)
	})

	test("box is disposed immediately after element is deleted from parent array when not subscribed - set", () => {
		const parent = box([{id: "a", value: 5}])
		const context = parent.getArrayContext(x => x.id)
		const a = context.getBoxForKey("a")
		parent.set([])
		expect(() => a.set({id: "a", value: 6})).to.throwError(/no longer attached/)
	})

})