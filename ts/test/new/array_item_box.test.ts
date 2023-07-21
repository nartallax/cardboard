import {describe, test} from "@nartallax/clamsensor"
import {WBoxInternal, box, constBox, isConstBox, isRBox, isWBox, unbox, viewBox} from "src/new/internal"
import expect from "expect.js"
import {makeCallCounter} from "test/test_utils"

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

	test("array items without subscribers", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}])
		const parentInternal = parent as unknown as WBoxInternal<readonly {id: number, name: string}[]>
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

		// changing the id within the box
		box2.set({id: 4, name: "4"})
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(box1.get().name).to.be.equal("1")
		expect(box2.get().name).to.be.equal("4")
		expect(box2.get().id).to.be.equal(4)
		expect(parent.get()[2]!).to.be.equal(box2.get())

		parent.set([parent.get()[0]!, parent.get()[2]!])
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(box2.get().name).to.be.equal("4")
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

		{
			const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}])
			const context = parent.getArrayContext(el => el.id)
			const box1 = context.getBoxes()[0]!
			expect(() => box1.set({id: 2, name: "uwu"})).to.throwError(/key is not unique: 2/i)
		}
	})

	test("array items with subscribers", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}])
		const parentInternal = parent as unknown as WBoxInternal<readonly {id: number, name: string}[]>
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

		// changing the id within the box
		box2.set({id: 4, name: "4"})
		expect(box1.get().name).to.be.equal("1")
		expect(box2.get().name).to.be.equal("4")
		expect(box2.get().id).to.be.equal(4)
		expect(parent.get()[2]!).to.be.equal(box2.get())
		expect(box2.get()).to.be.equal(counter.lastCallValue)
		expect(counter.callCount).to.be.equal(3)

		parent.set([parent.get()[0]!, parent.get()[2]!])
		expect(box2.get().name).to.be.equal("4")
		expect(box2.get()).to.be.equal(counter.lastCallValue)
		expect(counter.callCount).to.be.equal(3)
		expect(() => box1.get()).to.throwError(/This array item box \(key = 1\) is no longer attached/i)
		expect(() => box1.set({id: 5, name: "5"})).to.throwError(/This array item box \(key = 1\) is no longer attached/i)
		expect(parent.get().length).to.be.equal(2)

		box2.unsubscribe(counter)
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
	})

	test("chain array items without subscribers", () => {
		const parent = box([[{id: 1, name: "1"}, {id: 2, name: "2"}], [{id: 3, name: "3"}]])
		const parentInternal = parent as unknown as WBoxInternal<readonly {id: number, name: string}[][]>
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

		box1.set({id: 5, name: "uwu"})
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(parent.get()[0]![0]!.name).to.be.equal("uwu")

		parent.set([parent.get()[1]!, parent.get()[0]!])
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(box1.get().name).to.be.equal("uwu")
		expect(box1.get()).to.be.equal(parent.get()[1]![0]!)

		parent.set([parent.get()[0]!, [parent.get()[1]![1]!, parent.get()[1]![0]!]])
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(box1.get().name).to.be.equal("uwu")
		expect(box1.get()).to.be.equal(parent.get()[1]![1]!)

		box1.set({id: 6, name: "ayaya"})
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(parent.get()[1]![1]!.name).to.be.equal("ayaya")

		parent.set([parent.get()[0]!, [parent.get()[1]![0]!]])
		// that's about array
		expect(() => box1.get()).to.throwError(/key is not unique: 1/i)

		parent.set([parent.get()[0]!, [parent.get()[1]![0]!, {id: 12345, name: "nya"}]])
		expect(() => box1.get()).to.throwError(/This array item box \(key = 6\) is no longer attached/i)
	})

	test("chain array items with subscribers", () => {
		const parent = box([[{id: 1, name: "1"}, {id: 2, name: "2"}], [{id: 3, name: "3"}]])
		const parentInternal = parent as unknown as WBoxInternal<readonly {id: number, name: string}[][]>
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

		box1.set({id: 5, name: "uwu"})
		expect(parent.get()[0]![0]!.name).to.be.equal("uwu")
		expect(counter.callCount).to.be.equal(3)
		expect(counter.lastCallValue).to.be.equal(box1.get())

		parent.set([parent.get()[1]!, parent.get()[0]!])
		expect(box1.get().name).to.be.equal("uwu")
		expect(box1.get()).to.be.equal(parent.get()[1]![0]!)
		expect(counter.callCount).to.be.equal(3)
		expect(counter.lastCallValue).to.be.equal(box1.get())

		parent.set([parent.get()[0]!, [parent.get()[1]![1]!, parent.get()[1]![0]!]])
		expect(box1.get().name).to.be.equal("uwu")
		expect(box1.get()).to.be.equal(parent.get()[1]![1]!)
		expect(counter.callCount).to.be.equal(3)
		expect(counter.lastCallValue).to.be.equal(box1.get())

		box1.set({id: 6, name: "ayaya"})
		expect(parent.get()[1]![1]!.name).to.be.equal("ayaya")
		expect(counter.callCount).to.be.equal(4)
		expect(counter.lastCallValue).to.be.equal(box1.get())
		expect(counter.lastCallValue).to.be.equal(parent.get()[1]![1]!)

		box1.unsubscribe(counter)
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
		expect(box1.get().name).to.be.equal("ayaya")
		expect(counter.lastCallValue).to.be.equal(box1.get())
		expect(counter.lastCallValue).to.be.equal(parent.get()[1]![1]!)
	})

	test("chain array items with subscribers throw 1", () => {
		const parent = box([[{id: 1, name: "1"}, {id: 2, name: "2"}], [{id: 3, name: "3"}]])
		const parentInternal = parent as unknown as WBoxInternal<readonly {id: number, name: string}[][]>
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

		box1.set({id: 5, name: "uwu"})
		expect(parent.get()[0]![0]!.name).to.be.equal("uwu")
		expect(counter.callCount).to.be.equal(3)
		expect(counter.lastCallValue).to.be.equal(box1.get())

		parent.set([parent.get()[1]!, parent.get()[0]!])
		expect(box1.get().name).to.be.equal("uwu")
		expect(box1.get()).to.be.equal(parent.get()[1]![0]!)
		expect(counter.callCount).to.be.equal(3)
		expect(counter.lastCallValue).to.be.equal(box1.get())

		parent.set([parent.get()[0]!, [parent.get()[1]![1]!, parent.get()[1]![0]!]])
		expect(box1.get().name).to.be.equal("uwu")
		expect(box1.get()).to.be.equal(parent.get()[1]![1]!)
		expect(counter.callCount).to.be.equal(3)
		expect(counter.lastCallValue).to.be.equal(box1.get())

		box1.set({id: 6, name: "ayaya"})
		expect(parent.get()[1]![1]!.name).to.be.equal("ayaya")
		expect(counter.callCount).to.be.equal(4)
		expect(counter.lastCallValue).to.be.equal(box1.get())
		expect(counter.lastCallValue).to.be.equal(parent.get()[1]![1]!)

		// that's about array
		expect(() => parent.set([parent.get()[0]!, [parent.get()[1]![0]!]])).to.throwError(/key is not unique: 1/i)
	})

	test("chain array item with subscribers throw 2", () => {
		const parent = box([[{id: 1, name: "1"}, {id: 2, name: "2"}], [{id: 3, name: "3"}]])
		const parentInternal = parent as unknown as WBoxInternal<readonly {id: number, name: string}[][]>
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

		box1.set({id: 5, name: "uwu"})
		expect(parent.get()[0]![0]!.name).to.be.equal("uwu")
		expect(counter.callCount).to.be.equal(3)
		expect(counter.lastCallValue).to.be.equal(box1.get())

		parent.set([parent.get()[1]!, parent.get()[0]!])
		expect(box1.get().name).to.be.equal("uwu")
		expect(box1.get()).to.be.equal(parent.get()[1]![0]!)
		expect(counter.callCount).to.be.equal(3)
		expect(counter.lastCallValue).to.be.equal(box1.get())

		parent.set([parent.get()[0]!, [parent.get()[1]![1]!, parent.get()[1]![0]!]])
		expect(box1.get().name).to.be.equal("uwu")
		expect(box1.get()).to.be.equal(parent.get()[1]![1]!)
		expect(counter.callCount).to.be.equal(3)
		expect(counter.lastCallValue).to.be.equal(box1.get())

		box1.set({id: 6, name: "ayaya"})
		expect(parent.get()[1]![1]!.name).to.be.equal("ayaya")
		expect(counter.callCount).to.be.equal(4)
		expect(counter.lastCallValue).to.be.equal(box1.get())
		expect(counter.lastCallValue).to.be.equal(parent.get()[1]![1]!)

		parent.set([parent.get()[0]!, [parent.get()[1]![0]!, {id: 12345, name: "nya"}]])
		expect(counter.callCount).to.be.equal(4)
		expect(() => box1.get()).to.throwError(/This array item box \(key = 6\) is no longer attached/i)
	})

	test("chain array wraps with subscribers throw 3", () => {
		const parent = box([[{id: 1, name: "1"}, {id: 2, name: "2"}], [{id: 3, name: "3"}]])
		const parentInternal = parent as unknown as WBoxInternal<{id: number, name: string}[][]>
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
		const parentInternal = parent as unknown as WBoxInternal<{a: {id: number, name: string}[]}>
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

		box6.set({id: 7, name: "uwu"})
		expect(box6.get().name).to.be.equal("uwu")
		expect(parent.get().a[1]).to.be.equal(box6.get())
		expect(counter.lastCallValue).to.be.equal(box6.get())
		expect(counter.callCount).to.be.equal(2)

		parent.set({a: [{id: 7, name: "owo"}, {id: 5, name: "uwu"}]})
		expect(box6.get().name).to.be.equal("owo")
		expect(box6.get().id).to.be.equal(7)
		expect(parent.get().a[0]).to.be.equal(box6.get())
		expect(counter.lastCallValue).to.be.equal(box6.get())
		expect(counter.callCount).to.be.equal(3)

		box6.unsubscribe(counter)
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
	})

	test("arraywrap and prop test chain no sub", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}])
		const parentInternal = parent as unknown as WBoxInternal<{id: number, name: string}[]>
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
		const parentInternal = parent as unknown as WBoxInternal<{id: number, name: string}[]>
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
		const parentInternal = parent as unknown as WBoxInternal<{id: number, name: string}[]>
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
		const parentInternal = parent as unknown as WBoxInternal<{id: number, name: string}[]>
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
		const parentInternal = parent as unknown as WBoxInternal<{id: number, name: string}[]>
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
		const parentInternal = parent as unknown as WBoxInternal<{a: {id: number, name: string}[]}>
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
		const parentInternal = parent as unknown as WBoxInternal<{a: {id: number, name: string}[]}>
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
		const parentInternal = parent as unknown as WBoxInternal<{id: number, a: {id: number, name: string}[]}[]>
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
		const parentInternal = parent as unknown as WBoxInternal<{id: number, a: {id: number, name: string}[]}[]>
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
		const parentInternal = parent as unknown as WBoxInternal<{id: number, a: {id: number, name: string}[]}[]>
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
		const parentInternal = parent as unknown as WBoxInternal<{id: number, name: string}[]>
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

		box1.set({id: 2, name: "2"})
		expect(boxCounter.lastCallValue).to.be.equal(view.get())
		expect(viewCounter.lastCallValue).to.be.equal(box1.get())
		expect(box1.get()).to.be.equal(view.get())
		expect(box1.get().name).to.be.equal("2")
		expect(boxCounter.callCount).to.be.equal(3)
		expect(viewCounter.callCount).to.be.equal(3)

		view.unsubscribe(viewCounter)
		box1.unsubscribe(boxCounter)
		expect(parentInternal.haveSubscribers()).to.be.equal(false)
	})

	test("arraywrap item and view", () => {
		const parent = box([{id: 1, name: "1"}])
		const parentInternal = parent as unknown as WBoxInternal<{id: number, name: string}[]>
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

		box1.set({id: 2, name: "2"})
		expect(boxCounter.lastCallValue).to.be.equal(view.get())
		expect(viewCounter.lastCallValue).to.be.equal(box1.get())
		expect(box1.get()).to.be.equal(view.get())
		expect(box1.get().name).to.be.equal("2")
		expect(boxCounter.callCount).to.be.equal(3)
		expect(viewCounter.callCount).to.be.equal(3)

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

})