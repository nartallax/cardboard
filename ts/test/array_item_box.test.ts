import {describe, test} from "@nartallax/clamsensor"
import {BoxInternal, box, constBox, isConstBox, isRBox, isWBox, unbox, viewBox} from "src/internal"
import expect from "expect.js"
import {expectExecutionTimeLessThan, makeCallCounter} from "test/test_utils"

describe("ArrayItemBox", () => {
	test("isRBox", () => {
		expect(isRBox(box([1]).getArrayContext(e => e).getBoxes()[0])).to.be(true)
		expect(isRBox(viewBox(() => [1]).getArrayContext(e => e).getBoxes()[0])).to.be(true)
		expect(isRBox(constBox([1]).getArrayContext(e => e).getBoxes()[0])).to.be(true)
	})

	test("isWBox", () => {
		expect(isWBox(box([1]).getArrayContext(e => e).getBoxes()[0])).to.be(true)
		expect(isWBox(viewBox(() => [1]).getArrayContext(e => e).getBoxes()[0])).to.be(false)
		expect(isWBox(constBox([1]).getArrayContext(e => e).getBoxes()[0])).to.be(false)
	})

	test("isConstBox", () => {
		expect(isConstBox(box([1]).getArrayContext(e => e).getBoxes()[0])).to.be(false)
		expect(isConstBox(viewBox(() => [1]).getArrayContext(e => e).getBoxes()[0])).to.be(false)
		expect(isConstBox(constBox([1]).getArrayContext(e => e).getBoxes()[0])).to.be(true)
	})

	test("unbox", () => {
		expect(unbox(box([1]).getArrayContext(e => e).getBoxes()[0])).to.be(1)
		expect(unbox(viewBox(() => [1]).getArrayContext(e => e).getBoxes()[0])).to.be(1)
		expect(unbox(constBox([1]).getArrayContext(e => e).getBoxes()[0])).to.be(1)
	})

	test("toString", () => {
		expect(box([1]).getArrayContext(e => e).getBoxes()[0] + "").to.be("ArrayItemBox(1)")
		expect(viewBox(() => [1]).getArrayContext(e => e).getBoxes()[0] + "").to.be("ArrayItemBox(1)")
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
		expect(() => box1.get()).to.throwError(/This array item box \(key = 1\) is no longer attached/i)
		expect(() => box1.set({id: 5, name: "5"})).to.throwError(/This array item box \(key = 1\) is no longer attached/i)
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
		expect(() => box1.get()).to.throwError(/This array item box \(key = 1\) is no longer attached/i)
		expect(() => box1.set({id: 5, name: "5"})).to.throwError(/This array item box \(key = 1\) is no longer attached/i)
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
		expect(() => box1.get()).to.throwError(/This array item box \(key = 1\) is no longer attached/i)
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
		expect(() => box1.get()).to.throwError(/This array item box \(key = 1\) is no longer attached/i)
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
		expect(() => box1.get()).to.throwError(/This array item box \(key = 2\) is no longer attached/i)
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
		expect(() => box6.get()).to.throwError(/This array item box \(key = 6\) is no longer attached/i)
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

	test("arraywrap and viewbox chain no sub", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}])
		const parentInternal = parent as unknown as BoxInternal<{id: number, name: string}[]>
		const context = parent.getArrayContext(el => el.id)
		const box1 = context.getBoxes()[0]!
		const view1 = viewBox(() => box1.get().name + ", nya")

		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(view1.get()).to.be.equal("1, nya")
		expect(parent.get()[0]!.name).to.be.equal("1")

		parent.set([{id: 1, name: "11"}, parent.get()[1]!])
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(view1.get()).to.be.equal("11, nya")
		expect(parent.get()[0]!.name).to.be.equal("11")

		parent.set([parent.get()[1]!, {id: 1, name: "11"}])
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(view1.get()).to.be.equal("11, nya")
		expect(parent.get()[1]!.name).to.be.equal("11")

		parent.set([parent.get()[0]!])
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(() => view1.get()).to.throwError(/This array item box \(key = 1\) is no longer attached/i)
	})

	test("arraywrap and viewbox chain with sub", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}])
		const parentInternal = parent as unknown as BoxInternal<{id: number, name: string}[]>
		const context = parent.getArrayContext(el => el.id)
		const box1 = context.getBoxes()[0]!
		const view1 = viewBox(() => box1.get().name + ", nya")

		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		const counter = makeCallCounter()
		view1.subscribe(counter)

		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		expect(view1.get()).to.be.equal("1, nya")
		expect(parent.get()[0]!.name).to.be.equal("1")
		expect(counter.callCount).to.be.equal(0)

		parent.set([{id: 1, name: "11"}, parent.get()[1]!])
		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		expect(view1.get()).to.be.equal("11, nya")
		expect(parent.get()[0]!.name).to.be.equal("11")
		expect(counter.lastCallValue).to.be.equal(view1.get())
		expect(counter.callCount).to.be.equal(1)

		parent.set([parent.get()[1]!, {id: 1, name: "11"}])
		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		expect(view1.get()).to.be.equal("11, nya")
		expect(parent.get()[1]!.name).to.be.equal("11")
		expect(counter.lastCallValue).to.be.equal(view1.get())
		expect(counter.callCount).to.be.equal(1)

		view1.unsubscribe(counter)
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(view1.get()).to.be.equal("11, nya")
		expect(counter.callCount).to.be.equal(1)
	})

	test("arraywrap and viewbox chain with sub different throw", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}])
		const parentInternal = parent as unknown as BoxInternal<{id: number, name: string}[]>
		const context = parent.getArrayContext(el => el.id)
		const box1 = context.getBoxes()[0]!
		const view1 = viewBox(() => box1.get().name + ", nya")

		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		const counter = makeCallCounter()
		view1.subscribe(counter)

		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		expect(view1.get()).to.be.equal("1, nya")
		expect(parent.get()[0]!.name).to.be.equal("1")
		expect(counter.callCount).to.be.equal(0)

		parent.set([{id: 1, name: "11"}, parent.get()[1]!])
		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		expect(view1.get()).to.be.equal("11, nya")
		expect(parent.get()[0]!.name).to.be.equal("11")
		expect(counter.lastCallValue).to.be.equal(view1.get())
		expect(counter.callCount).to.be.equal(1)

		parent.set([parent.get()[1]!, {id: 1, name: "11"}])
		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		expect(view1.get()).to.be.equal("11, nya")
		expect(parent.get()[1]!.name).to.be.equal("11")
		expect(counter.lastCallValue).to.be.equal(view1.get())
		expect(counter.callCount).to.be.equal(1)

		parent.set([parent.get()[0]!])
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(() => view1.get()).to.throwError(/This array item box \(key = 1\) is no longer attached/i)
		expect(counter.callCount).to.be.equal(1)
	})

	test("viewbox and arraywrap chain no sub", () => {
		const parent = box({a: [{id: 1, name: "1"}]})
		const parentInternal = parent as unknown as BoxInternal<{a: {id: number, name: string}[]}>
		const view = viewBox(() => parent.get().a)
		const context = view.getArrayContext(el => el.id)
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
		expect(() => box1.get()).to.throwError(/This array item box \(key = 1\) is no longer attached/i)
	})

	test("viewbox and arraywrap chain with sub", () => {
		const parent = box({a: [{id: 1, name: "1"}]})
		const parentInternal = parent as unknown as BoxInternal<{a: {id: number, name: string}[]}>
		const view = viewBox(() => parent.get().a)
		const context = view.getArrayContext(el => el.id)
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

	test("arraywrap of viewbox of arraywrap no sub", () => {
		const parent = box([{a: [{id: 7, name: "1"}], id: 5}])
		const parentInternal = parent as unknown as BoxInternal<{id: number, a: {id: number, name: string}[]}[]>
		const firstContext = parent.getArrayContext(el => el.id)
		const firstContextBox = firstContext.getBoxes()[0]!
		const view = viewBox(() => firstContextBox.get().a)
		const secondContext = view.getArrayContext(el => el.id)
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
		expect(() => box1.get()).to.throwError(/This array item box \(key = 5\) is no longer attached/i)
	})

	test("arraywrap of viewbox of arraywrap with sub", () => {
		const parent = box([{a: [{id: 7, name: "1"}], id: 5}])
		const parentInternal = parent as unknown as BoxInternal<{id: number, a: {id: number, name: string}[]}[]>
		const firstContext = parent.getArrayContext(el => el.id)
		const firstContextBox = firstContext.getBoxes()[0]!
		const view = viewBox(() => firstContextBox.get().a)
		const secondContext = view.getArrayContext(el => el.id)
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
		expect(() => box1.get()).to.throwError(/This array item box \(key = 5\) is no longer attached/i)
	})

	test("arraywrap of viewbox of arraywrap with sub no throw", () => {
		const parent = box([{a: [{id: 7, name: "1"}], id: 5}])
		const parentInternal = parent as unknown as BoxInternal<{id: number, a: {id: number, name: string}[]}[]>
		const firstContext = parent.getArrayContext(el => el.id)
		const firstContextBox = firstContext.getBoxes()[0]!
		const view = viewBox(() => firstContextBox.get().a)
		const secondContext = view.getArrayContext(el => el.id)
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
		expect(() => box1.get()).to.throwError(/This array item box \(key = 1\) is no longer attached/i)
	})

	test("view and arraywrap item", () => {
		const parent = box([{id: 1, name: "1"}])
		const parentInternal = parent as unknown as BoxInternal<{id: number, name: string}[]>
		const view = viewBox(() => parent.get()[0]!)
		const context = parent.getArrayContext(el => el.id)
		const box1 = context.getBoxes()[0]!

		const viewCounter = makeCallCounter()
		view.subscribe(viewCounter)

		const boxCounter = makeCallCounter()
		box1.subscribe(boxCounter)

		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		expect(box1.get()).to.be.equal(view.get())
		expect(box1.get().name).to.be.equal("1")

		parent.set([{id: 1, name: "11"}])
		expect(boxCounter.lastCallValue).to.be.equal(view.get())
		expect(viewCounter.lastCallValue).to.be.equal(box1.get())
		expect(box1.get()).to.be.equal(view.get())
		expect(box1.get().name).to.be.equal("11")
		expect(boxCounter.callCount).to.be.equal(1)
		expect(viewCounter.callCount).to.be.equal(1)

		box1.set({id: 1, name: "111"})
		expect(boxCounter.lastCallValue).to.be.equal(view.get())
		expect(viewCounter.lastCallValue).to.be.equal(box1.get())
		expect(box1.get()).to.be.equal(view.get())
		expect(box1.get().name).to.be.equal("111")
		expect(boxCounter.callCount).to.be.equal(2)
		expect(viewCounter.callCount).to.be.equal(2)

		view.unsubscribe(viewCounter)
		box1.unsubscribe(boxCounter)
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
	})

	test("arraywrap item and view", () => {
		const parent = box([{id: 1, name: "1"}])
		const parentInternal = parent as unknown as BoxInternal<{id: number, name: string}[]>
		const context = parent.getArrayContext(el => el.id)
		const box1 = context.getBoxes()[0]!
		const view = viewBox(() => parent.get()[0]!)

		const viewCounter = makeCallCounter()
		view.subscribe(viewCounter)

		const boxCounter = makeCallCounter()
		box1.subscribe(boxCounter)

		expect(parentInternal.haveSubscribers()).to.be.equal(true)
		expect(box1.get()).to.be.equal(view.get())
		expect(box1.get().name).to.be.equal("1")

		parent.set([{id: 1, name: "11"}])
		expect(boxCounter.lastCallValue).to.be.equal(view.get())
		expect(viewCounter.lastCallValue).to.be.equal(box1.get())
		expect(box1.get()).to.be.equal(view.get())
		expect(box1.get().name).to.be.equal("11")
		expect(boxCounter.callCount).to.be.equal(1)
		expect(viewCounter.callCount).to.be.equal(1)

		box1.set({id: 1, name: "111"})
		expect(boxCounter.lastCallValue).to.be.equal(view.get())
		expect(viewCounter.lastCallValue).to.be.equal(box1.get())
		expect(box1.get()).to.be.equal(view.get())
		expect(box1.get().name).to.be.equal("111")
		expect(boxCounter.callCount).to.be.equal(2)
		expect(viewCounter.callCount).to.be.equal(2)

		view.unsubscribe(viewCounter)
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

	test("map array", () => {
		const arrBox = box([
			{id: 1, name: "1"},
			{id: 2, name: "2"},
			{id: 3, name: "3"}
		])

		let callCount = 0
		const mapResult = arrBox.mapArray(x => {
			callCount++
			return JSON.stringify(x)
		}, x => JSON.parse(x))
		expect(callCount).to.be(0)
		expect(mapResult.get()[0]!).to.be("{\"id\":1,\"name\":\"1\"}")
		mapResult.set(["{\"id\":1,\"name\":\"uwu\"}", mapResult.get()[1]!, mapResult.get()[2]!])
		expect(arrBox.get()[0]).to.eql({id: 1, name: "uwu"})
		expect(callCount).to.be(3)

		arrBox.set([arrBox.get()[1]!, arrBox.get()[2]!, arrBox.get()[0]!])
		expect(arrBox.get()[0]).to.eql({id: 2, name: "2"})
		expect(mapResult.get()[2]!).to.be("{\"id\":1,\"name\":\"uwu\"}")
		expect(callCount).to.be(3)

		arrBox.set([arrBox.get()[0]!, arrBox.get()[1]!, {...arrBox.get()[2]!, name: "owo"}])
		expect(mapResult.get()[2]!).to.be("{\"id\":1,\"name\":\"owo\"}")
		expect(callCount).to.be(4)

	})

	test("readonly array", () => {
		const roArr: readonly {id: number, name: string}[] = [
			{id: 1, name: "1"},
			{id: 2, name: "2"},
			{id: 3, name: "3"}
		]
		const arrBox = box(roArr)

		const mapResult = arrBox.mapArray(x => JSON.stringify(x), x => JSON.parse(x))
		expect(mapResult.get()[0]!).to.be("{\"id\":1,\"name\":\"1\"}")
		mapResult.set(["{\"id\":1,\"name\":\"uwu\"}", mapResult.get()[1]!, mapResult.get()[2]!])
		expect(arrBox.get()[0]).to.eql({id: 1, name: "uwu"})
	})

	test("maparray box should throw if its value is requested while the value is being recalculated", () => {
		try {
			const urls = viewBox(() => ["1", "2", "3"])
			let maxImageHeight = 0
			const calcMaxHeight = () => {
				const imgs = images.get()
				maxImageHeight = imgs.reduce((a, b) => Math.max(a, b.height), 0)
			}
			const images = urls.mapArray(
				url => {
					const img = {width: parseInt(url), height: parseInt(url)}
					calcMaxHeight()
					return img
				}
			)
			void maxImageHeight
		} catch(e){
			// cannot access images before initialization
			// this test is about synchronous call of callback mapArray
			expect(e + "").to.match(/images/)
		}
	})

	test("two boxes of the same item", () => {
		const arrBox = box([{id: 1, name: "one"}])
		const context = arrBox.getArrayContext(x => x.id)
		const firstBox = context.getBoxForKey(1)
		const secondBox = context.getBoxForKey(1)

		firstBox.set({id: 1, name: "two"})
		expect(secondBox.get().name).to.be("two")

		secondBox.set({id: 1, name: "three"})
		expect(firstBox.get().name).to.be("three")

		const counter = makeCallCounter()
		secondBox.subscribe(counter)
		firstBox.set({id: 1, name: "four"})
		expect(counter.callCount).to.be(1)
		expect(counter.lastCallValue).to.eql({id: 1, name: "four"})
	})

	test("two boxes of the same item from different contexts", () => {
		const arrBox = box([{id: 1, name: "one"}])
		const firstContext = arrBox.getArrayContext(x => x.id)
		const firstBox = firstContext.getBoxForKey(1)
		const secondContext = arrBox.getArrayContext(x => x.id)
		const secondBox = secondContext.getBoxForKey(1)

		firstBox.set({id: 1, name: "two"})
		expect(secondBox.get().name).to.be("two")

		secondBox.set({id: 1, name: "three"})
		expect(firstBox.get().name).to.be("three")

		const counter = makeCallCounter()
		secondBox.subscribe(counter)
		firstBox.set({id: 1, name: "four"})
		expect(counter.callCount).to.be(1)
		expect(counter.lastCallValue).to.eql({id: 1, name: "four"})
	})

	test("changing array item id throws", () => {
		const arrBox = box([{id: 1, name: "one"}])
		const context = arrBox.getArrayContext(x => x.id)
		const item = context.getBoxForKey(1)

		expect(() => item.set({id: 2, name: "two"})).to.throwError(/changed key/)
	})

	test("performance: array item update, one context", () => {
		const size = 1000
		const repeats = 10
		const arrBox = box(new Array(size).fill(null).map((_, i) => i))
		const context = arrBox.getArrayContext((_, i) => i)
		context.getBoxForKey(0).subscribe(() => {/* noop */})
		expectExecutionTimeLessThan(20, 100, () => {
			for(let rep = 0; rep < repeats; rep++){
				for(let i = 0; i < size; i++){
					const box = context.getBoxForKey(i)
					box.set(box.get() * 2)
				}
			}
		})
	})

	test("performance: array item update, two contexts", () => {
		const size = 1000
		const repeats = 10
		const arrBox = box(new Array(size).fill(null).map((_, i) => i))
		const firstContext = arrBox.getArrayContext((_, i) => i)
		const secondContext = arrBox.getArrayContext((_, i) => i)
		firstContext.getBoxForKey(0).subscribe(() => {/* noop */})
		secondContext.getBoxForKey(0).subscribe(() => {/* noop */})
		expectExecutionTimeLessThan(30, 100, () => {
			for(let rep = 0; rep < repeats; rep++){
				for(let i = 0; i < size; i++){
					const cont = i & 1 ? firstContext : secondContext
					const box = cont.getBoxForKey(i)
					box.set(box.get() * 2)
				}
			}
		})
	})

	test("notifications are not dropped on same-context update while previous update is in progress", () => {
		const arrayBox = box(["a", "aa"])
		const firstContext = arrayBox.getArrayContext(x => x.length)
		const secondContext = arrayBox.getArrayContext(x => x.length)
		const thirdContext = arrayBox.getArrayContext(x => x.length)
		const firstItemBox = firstContext.getBoxForKey(1)
		const secondItemBox = secondContext.getBoxForKey(1)
		const thirdItemBox = thirdContext.getBoxForKey(1)
		const thirdItemBoxB = thirdContext.getBoxForKey(2)

		const firstCounter = makeCallCounter("first")
		firstItemBox.subscribe(firstCounter)

		const secondCounter = makeCallCounter("second")
		secondItemBox.subscribe(secondCounter)

		const thirdCounter = makeCallCounter("third")
		thirdItemBox.subscribe(thirdCounter)

		// on box update new partial update will be created
		// and existing in-progress update may be lost, i.e. not delivered to one of those boxes
		// or notification can be dropped because newer update is started;
		// that means third subscriber won't get his value at all, because third arraycontext issued new update
		secondItemBox.subscribe(() => thirdItemBoxB.set("bb"))
		thirdItemBox.subscribe(() => thirdItemBoxB.set("bb"))

		firstItemBox.set("b")

		expect(secondCounter.lastCallValue).to.be("b")
		expect(thirdCounter.lastCallValue).to.be("b")
	})

	test("setElementAtIndex method", () => {
		const parent = box([1, 2, 3])
		const context = parent.getArrayContext((_, i) => i)
		const child = context.getBoxForKey(1)

		const parentCounter = makeCallCounter()
		parent.subscribe(parentCounter)

		const childCounter = makeCallCounter()
		child.subscribe(childCounter)

		parent.setElementAtIndex(0, 5)
		expect(parentCounter.callCount).to.be(1)
		expect(parentCounter.lastCallValue).to.eql([5, 2, 3])
		expect(childCounter.callCount).to.be(0)

		parent.setElementAtIndex(1, 10)
		expect(parentCounter.callCount).to.be(2)
		expect(parentCounter.lastCallValue).to.eql([5, 10, 3])
		expect(childCounter.callCount).to.be(1)
		expect(childCounter.lastCallValue).to.be(10)
	})

	test("insertElementAtIndex method", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}, {id: 3, name: "3"}])
		const context = parent.getArrayContext(x => x.id)
		const box1 = context.getBoxForKey(1)
		const box3 = context.getBoxForKey(3)

		parent.insertElementAtIndex(1, {id: 4, name: "4"})
		expect(box1.get().name).to.be("1")
		expect(box3.get().name).to.be("3")
		expect(parent.get()).to.eql([{id: 1, name: "1"}, {id: 4, name: "4"}, {id: 2, name: "2"}, {id: 3, name: "3"}])

		const box4 = context.getBoxForKey(4)
		expect(box4.get().name).to.be("4")
	})

	test("deleteElementAtIndex", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}, {id: 3, name: "3"}])
		const context = parent.getArrayContext(x => x.id)
		const box1 = context.getBoxForKey(1)
		const box3 = context.getBoxForKey(3)

		parent.deleteElementAtIndex(1)
		expect(parent.get()).to.eql([{id: 1, name: "1"}, {id: 3, name: "3"}])
		expect(box1.get()).to.eql({id: 1, name: "1"})
		expect(box3.get()).to.eql({id: 3, name: "3"})

		parent.deleteElementAtIndex(0)
		expect(parent.get()).to.eql([{id: 3, name: "3"}])
		expect(box3.get()).to.eql({id: 3, name: "3"})
		expect(() => box1.get()).to.throwError(/no longer attached/)
	})

})