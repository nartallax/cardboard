import {viewBox, box, WBox, RBox} from "src/cardboard"
import {describe, test} from "@nartallax/clamsensor"
import expect from "expect.js"

type RBoxInternal<T> = RBox<T> & {haveSubscribers(): boolean}
type WBoxInternal<T> = WBox<T> & RBoxInternal<T>

describe("box", () => {

	test("array wraps without subscribers", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}]) as WBoxInternal<{id: number, name: string}[]>
		const wrapper = parent.wrapElements(x => x.id)
		const box1 = wrapper()[0]!
		const box2 = wrapper()[1]!

		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(box1().name).to.be.equal("1")
		expect(box2().name).to.be.equal("2")

		parent([parent()[0]!, {id: 2, name: "22"}])
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(box1().name).to.be.equal("1")
		expect(box2().name).to.be.equal("22")

		parent([{id: 3, name: "3"}, parent()[0]!, {id: 2, name: "222"}])
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(box1().name).to.be.equal("1")
		expect(box2().name).to.be.equal("222")

		// changing the id within the box
		box2({id: 4, name: "4"})
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(box1().name).to.be.equal("1")
		expect(box2().name).to.be.equal("4")
		expect(box2().id).to.be.equal(4)
		expect(parent()[2]!).to.be.equal(box2())

		parent([parent()[0]!, parent()[2]!])
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(box2().name).to.be.equal("4")
		expect(box1).to.throwError(/box for key 1 is no longer attached/i)
		expect(() => box1({id: 5, name: "5"})).to.throwError(/box for key 1 is no longer attached/i)
		expect(parent().length).to.be.equal(2)
	})

	test("array wraps with duplicate keys will throw", () => {
		{
			const parent = box([{id: 1, name: "1"}, {id: 1, name: "2"}])
			const wrap = parent.wrapElements(el => el.id)
			expect(wrap).to.throwError(/key is not unique: 1/i)
		}

		{
			const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}])
			const wrap = parent.wrapElements(el => el.id)
			void wrap() // won't throw yet

			parent([{id: 1, name: "1"}, {id: 1, name: "2"}])
			expect(wrap).to.throwError(/key is not unique: 1/i)
		}

		{
			const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}])
			const wrap = parent.wrapElements(el => el.id)
			const box1 = wrap()[0]!
			expect(() => box1({id: 2, name: "uwu"})).to.throwError(/key is not unique: 2/i)
		}
	})

	test("array wraps with subscribers", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}]) as WBoxInternal<{id: number, name: string}[]>
		const wrapper = parent.wrapElements(x => x.id)
		const box1 = wrapper()[0]!
		const box2 = wrapper()[1]!

		let lastValue = box2()
		let callsCount = 0
		const unsub = box2.subscribe(v => {
			lastValue = v
			callsCount++
		})
		expect(parent.haveSubscribers()).to.be.equal(true)

		expect(box1().name).to.be.equal("1")
		expect(box2().name).to.be.equal("2")

		parent([parent()[0]!, {id: 2, name: "22"}])
		expect(box1().name).to.be.equal("1")
		expect(box2().name).to.be.equal("22")
		expect(box2()).to.be.equal(lastValue)
		expect(callsCount).to.be.equal(1)

		parent([{id: 3, name: "3"}, parent()[0]!, {id: 2, name: "222"}])
		expect(box1().name).to.be.equal("1")
		expect(box2().name).to.be.equal("222")
		expect(box2()).to.be.equal(lastValue)
		expect(callsCount).to.be.equal(2)

		// changing the id within the box
		box2({id: 4, name: "4"})
		expect(box1().name).to.be.equal("1")
		expect(box2().name).to.be.equal("4")
		expect(box2().id).to.be.equal(4)
		expect(parent()[2]!).to.be.equal(box2())
		expect(box2()).to.be.equal(lastValue)
		expect(callsCount).to.be.equal(3)

		parent([parent()[0]!, parent()[2]!])
		expect(box2().name).to.be.equal("4")
		expect(box2()).to.be.equal(lastValue)
		expect(callsCount).to.be.equal(3)
		expect(box1).to.throwError(/box for key 1 is no longer attached/i)
		expect(() => box1({id: 5, name: "5"})).to.throwError(/box for key 1 is no longer attached/i)
		expect(parent().length).to.be.equal(2)

		unsub()
		expect(parent.haveSubscribers()).to.be.equal(false)
	})

	test("chain array wraps without subscribers", () => {
		const parent = box([[{id: 1, name: "1"}, {id: 2, name: "2"}], [{id: 3, name: "3"}]]) as WBoxInternal<{id: number, name: string}[][]>
		const wrapA = parent.wrapElements(arr => arr.length)
		const wrapB = wrapA()[0]!.wrapElements(el => el.id)
		const box1 = wrapB()[0]!

		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(box1().name).to.be.equal("1")

		parent([[{id: 1, name: "11"}, parent()[0]![1]!], parent()[1]!])
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(box1().name).to.be.equal("11")

		box1({id: 1, name: "owo"})
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(box1().name).to.be.equal("owo")
		expect(parent()[0]![0]!.name).to.be.equal("owo")

		box1({id: 5, name: "uwu"})
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(parent()[0]![0]!.name).to.be.equal("uwu")

		parent([parent()[1]!, parent()[0]!])
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(box1().name).to.be.equal("uwu")
		expect(box1()).to.be.equal(parent()[1]![0]!)

		parent([parent()[0]!, [parent()[1]![1]!, parent()[1]![0]!]])
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(box1().name).to.be.equal("uwu")
		expect(box1()).to.be.equal(parent()[1]![1]!)

		box1({id: 6, name: "ayaya"})
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(parent()[1]![1]!.name).to.be.equal("ayaya")

		parent([parent()[0]!, [parent()[1]![0]!]])
		// that's about array
		expect(box1).to.throwError(/key is not unique: 1/i)

		parent([parent()[0]!, [parent()[1]![0]!, {id: 12345, name: "nya"}]])
		expect(box1).to.throwError(/box for key 6 is no longer attached/i)
	})

	test("chain array wraps with subscribers", () => {
		const parent = box([[{id: 1, name: "1"}, {id: 2, name: "2"}], [{id: 3, name: "3"}]]) as WBoxInternal<{id: number, name: string}[][]>
		const wrapA = parent.wrapElements(arr => arr.length)
		const wrapB = wrapA()[0]!.wrapElements(el => el.id)
		const box1 = wrapB()[0]!

		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(box1().name).to.be.equal("1")

		let lastValue = box1()
		let callCount = 0
		const unsub = box1.subscribe(v => {
			lastValue = v
			callCount++
		})

		expect(parent.haveSubscribers()).to.be.equal(true)
		parent([[{id: 1, name: "11"}, parent()[0]![1]!], parent()[1]!])
		expect(box1().name).to.be.equal("11")
		expect(callCount).to.be.equal(1)
		expect(lastValue).to.be.equal(box1())
		expect(lastValue).to.be.equal(parent()[0]![0]!)

		box1({id: 1, name: "owo"})
		expect(box1().name).to.be.equal("owo")
		expect(parent()[0]![0]!.name).to.be.equal("owo")
		expect(callCount).to.be.equal(2)
		expect(lastValue).to.be.equal(box1())

		box1({id: 5, name: "uwu"})
		expect(parent()[0]![0]!.name).to.be.equal("uwu")
		expect(callCount).to.be.equal(3)
		expect(lastValue).to.be.equal(box1())

		parent([parent()[1]!, parent()[0]!])
		expect(box1().name).to.be.equal("uwu")
		expect(box1()).to.be.equal(parent()[1]![0]!)
		expect(callCount).to.be.equal(3)
		expect(lastValue).to.be.equal(box1())

		parent([parent()[0]!, [parent()[1]![1]!, parent()[1]![0]!]])
		expect(box1().name).to.be.equal("uwu")
		expect(box1()).to.be.equal(parent()[1]![1]!)
		expect(callCount).to.be.equal(3)
		expect(lastValue).to.be.equal(box1())

		box1({id: 6, name: "ayaya"})
		expect(parent()[1]![1]!.name).to.be.equal("ayaya")
		expect(callCount).to.be.equal(4)
		expect(lastValue).to.be.equal(box1())
		expect(lastValue).to.be.equal(parent()[1]![1]!)

		unsub()
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(box1().name).to.be.equal("ayaya")
		expect(lastValue).to.be.equal(box1())
		expect(lastValue).to.be.equal(parent()[1]![1]!)
	})

	test("chain array wraps with subscribers throw 1", () => {
		const parent = box([[{id: 1, name: "1"}, {id: 2, name: "2"}], [{id: 3, name: "3"}]]) as WBoxInternal<{id: number, name: string}[][]>
		const wrapA = parent.wrapElements(arr => arr.length)
		const wrapB = wrapA()[0]!.wrapElements(el => el.id)
		const box1 = wrapB()[0]!

		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(box1().name).to.be.equal("1")

		let lastValue = box1()
		let callCount = 0
		box1.subscribe(v => {
			lastValue = v
			callCount++
		})

		expect(parent.haveSubscribers()).to.be.equal(true)
		parent([[{id: 1, name: "11"}, parent()[0]![1]!], parent()[1]!])
		expect(box1().name).to.be.equal("11")
		expect(callCount).to.be.equal(1)
		expect(lastValue).to.be.equal(box1())
		expect(lastValue).to.be.equal(parent()[0]![0]!)

		box1({id: 1, name: "owo"})
		expect(box1().name).to.be.equal("owo")
		expect(parent()[0]![0]!.name).to.be.equal("owo")
		expect(callCount).to.be.equal(2)
		expect(lastValue).to.be.equal(box1())

		box1({id: 5, name: "uwu"})
		expect(parent()[0]![0]!.name).to.be.equal("uwu")
		expect(callCount).to.be.equal(3)
		expect(lastValue).to.be.equal(box1())

		parent([parent()[1]!, parent()[0]!])
		expect(box1().name).to.be.equal("uwu")
		expect(box1()).to.be.equal(parent()[1]![0]!)
		expect(callCount).to.be.equal(3)
		expect(lastValue).to.be.equal(box1())

		parent([parent()[0]!, [parent()[1]![1]!, parent()[1]![0]!]])
		expect(box1().name).to.be.equal("uwu")
		expect(box1()).to.be.equal(parent()[1]![1]!)
		expect(callCount).to.be.equal(3)
		expect(lastValue).to.be.equal(box1())

		box1({id: 6, name: "ayaya"})
		expect(parent()[1]![1]!.name).to.be.equal("ayaya")
		expect(callCount).to.be.equal(4)
		expect(lastValue).to.be.equal(box1())
		expect(lastValue).to.be.equal(parent()[1]![1]!)

		// that's about array
		expect(() => parent([parent()[0]!, [parent()[1]![0]!]])).to.throwError(/key is not unique: 1/i)
	})

	test("chain array wraps with subscribers throw 2", () => {
		const parent = box([[{id: 1, name: "1"}, {id: 2, name: "2"}], [{id: 3, name: "3"}]]) as WBoxInternal<{id: number, name: string}[][]>
		const wrapA = parent.wrapElements(arr => arr.length)
		const wrapB = wrapA()[0]!.wrapElements(el => el.id)
		const box1 = wrapB()[0]!

		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(box1().name).to.be.equal("1")

		let lastValue = box1()
		let callCount = 0
		box1.subscribe(v => {
			lastValue = v
			callCount++
		})

		expect(parent.haveSubscribers()).to.be.equal(true)
		parent([[{id: 1, name: "11"}, parent()[0]![1]!], parent()[1]!])
		expect(box1().name).to.be.equal("11")
		expect(callCount).to.be.equal(1)
		expect(lastValue).to.be.equal(box1())
		expect(lastValue).to.be.equal(parent()[0]![0]!)

		box1({id: 1, name: "owo"})
		expect(box1().name).to.be.equal("owo")
		expect(parent()[0]![0]!.name).to.be.equal("owo")
		expect(callCount).to.be.equal(2)
		expect(lastValue).to.be.equal(box1())

		box1({id: 5, name: "uwu"})
		expect(parent()[0]![0]!.name).to.be.equal("uwu")
		expect(callCount).to.be.equal(3)
		expect(lastValue).to.be.equal(box1())

		parent([parent()[1]!, parent()[0]!])
		expect(box1().name).to.be.equal("uwu")
		expect(box1()).to.be.equal(parent()[1]![0]!)
		expect(callCount).to.be.equal(3)
		expect(lastValue).to.be.equal(box1())

		parent([parent()[0]!, [parent()[1]![1]!, parent()[1]![0]!]])
		expect(box1().name).to.be.equal("uwu")
		expect(box1()).to.be.equal(parent()[1]![1]!)
		expect(callCount).to.be.equal(3)
		expect(lastValue).to.be.equal(box1())

		box1({id: 6, name: "ayaya"})
		expect(parent()[1]![1]!.name).to.be.equal("ayaya")
		expect(callCount).to.be.equal(4)
		expect(lastValue).to.be.equal(box1())
		expect(lastValue).to.be.equal(parent()[1]![1]!)

		parent([parent()[0]!, [parent()[1]![0]!, {id: 12345, name: "nya"}]])
		expect(callCount).to.be.equal(4)
		expect(box1).to.throwError(/box for key 6 is no longer attached/i)
	})

	test("chain array wraps with subscribers throw 3", () => {
		const parent = box([[{id: 1, name: "1"}, {id: 2, name: "2"}], [{id: 3, name: "3"}]]) as WBoxInternal<{id: number, name: string}[][]>
		const wrapA = parent.wrapElements(arr => arr.length)
		const wrapB = wrapA()[0]!.wrapElements(el => el.id)
		const box1 = wrapB()[0]!

		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(box1().name).to.be.equal("1")

		box1.subscribe(() => {
			// nothing
		})

		expect(parent.haveSubscribers()).to.be.equal(true)
		parent([])
		expect(box1).to.throwError(/box for key 2 is no longer attached/i)
	})

	test("prop and arraywrap chain with subscribers", () => {
		const parent = box({a: [{id: 5, name: "5"}, {id: 6, name: "6"}]}) as WBoxInternal<{a: {id: number, name: string}[]}>
		const prop = parent.prop("a")
		const arrWrap = prop.wrapElements(el => el.id)
		const box6 = arrWrap()[1]!

		expect(parent.haveSubscribers()).to.be.equal(false)

		let lastValue = box6()
		let callCount = 0
		const unsub = box6.subscribe(v => {
			lastValue = v
			callCount++
		})

		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(box6().name).to.be.equal("6")
		expect(callCount).to.be.equal(0)

		box6({id: 6, name: "66"})
		expect(box6().name).to.be.equal("66")
		expect(lastValue).to.be.equal(box6())
		expect(parent().a[1]).to.be.equal(box6())
		expect(callCount).to.be.equal(1)

		box6({id: 7, name: "uwu"})
		expect(box6().name).to.be.equal("uwu")
		expect(parent().a[1]).to.be.equal(box6())
		expect(lastValue).to.be.equal(box6())
		expect(callCount).to.be.equal(2)

		parent({a: [{id: 7, name: "owo"}, {id: 5, name: "uwu"}]})
		expect(box6().name).to.be.equal("owo")
		expect(box6().id).to.be.equal(7)
		expect(parent().a[0]).to.be.equal(box6())
		expect(lastValue).to.be.equal(box6())
		expect(callCount).to.be.equal(3)

		unsub()
		expect(parent.haveSubscribers()).to.be.equal(false)
	})

	test("arraywrap and prop test chain no sub", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}]) as WBoxInternal<{id: number, name: string}[]>
		const arrayWrap = parent.wrapElements(el => el.id)
		const prop = arrayWrap()[1]!.prop("name")

		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(prop()).to.be.equal("2")

		prop("22")
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(prop()).to.be.equal("22")
		expect(parent()[1]!.name).to.be.equal(prop())

		parent([parent()[1]!, parent()[0]!])
		expect(prop()).to.be.equal("22")
		expect(parent()[0]!.name).to.be.equal(prop())

		prop("222")
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(prop()).to.be.equal("222")
		expect(parent()[0]!.name).to.be.equal(prop())

		parent([{id: 2, name: "uwu"}, parent()[1]!])
		expect(prop()).to.be.equal("uwu")
		expect(parent()[0]!.name).to.be.equal(prop())
	})

	test("arraywrap and prop test chain with sub", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}]) as WBoxInternal<{id: number, name: string}[]>
		const arrayWrap = parent.wrapElements(el => el.id)
		const prop = arrayWrap()[1]!.prop("name")

		expect(parent.haveSubscribers()).to.be.equal(false)

		let lastValue = prop()
		let callCount = 0
		const unsub = prop.subscribe(v => {
			lastValue = v
			callCount++
		})

		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(prop()).to.be.equal("2")
		expect(lastValue).to.be.equal(prop())
		expect(callCount).to.be.equal(0)

		prop("22")
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(prop()).to.be.equal("22")
		expect(parent()[1]!.name).to.be.equal(prop())
		expect(lastValue).to.be.equal(prop())
		expect(callCount).to.be.equal(1)

		parent([parent()[1]!, parent()[0]!])
		expect(prop()).to.be.equal("22")
		expect(parent()[0]!.name).to.be.equal(prop())
		expect(lastValue).to.be.equal(prop())
		expect(callCount).to.be.equal(1)

		prop("222")
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(prop()).to.be.equal("222")
		expect(parent()[0]!.name).to.be.equal(prop())
		expect(lastValue).to.be.equal(prop())
		expect(callCount).to.be.equal(2)

		parent([{id: 2, name: "uwu"}, parent()[1]!])
		expect(prop()).to.be.equal("uwu")
		expect(parent()[0]!.name).to.be.equal(prop())
		expect(lastValue).to.be.equal(prop())
		expect(callCount).to.be.equal(3)

		unsub()
		expect(parent.haveSubscribers()).to.be.equal(false)
	})

	test("arraywrap and viewbox chain no sub", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}]) as WBoxInternal<{id: number, name: string}[]>
		const wrap = parent.wrapElements(el => el.id)
		const box1 = wrap()[0]!
		const view1 = viewBox(() => box1().name + ", nya")

		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(view1()).to.be.equal("1, nya")
		expect(parent()[0]!.name).to.be.equal("1")

		parent([{id: 1, name: "11"}, parent()[1]!])
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(view1()).to.be.equal("11, nya")
		expect(parent()[0]!.name).to.be.equal("11")

		parent([parent()[1]!, {id: 1, name: "11"}])
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(view1()).to.be.equal("11, nya")
		expect(parent()[1]!.name).to.be.equal("11")

		parent([parent()[0]!])
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(view1).to.throwError(/box for key 1 is no longer attached/i)
	})

	test("arraywrap and viewbox chain with sub", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}]) as WBoxInternal<{id: number, name: string}[]>
		const wrap = parent.wrapElements(el => el.id)
		const box1 = wrap()[0]!
		const view1 = viewBox(() => box1().name + ", nya")

		expect(parent.haveSubscribers()).to.be.equal(false)
		let lastValue = view1()
		let callCount = 0
		const unsub = view1.subscribe(v => {
			lastValue = v
			callCount++
		})

		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(view1()).to.be.equal("1, nya")
		expect(parent()[0]!.name).to.be.equal("1")
		expect(lastValue).to.be.equal(view1())
		expect(callCount).to.be.equal(0)

		parent([{id: 1, name: "11"}, parent()[1]!])
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(view1()).to.be.equal("11, nya")
		expect(parent()[0]!.name).to.be.equal("11")
		expect(lastValue).to.be.equal(view1())
		expect(callCount).to.be.equal(1)

		parent([parent()[1]!, {id: 1, name: "11"}])
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(view1()).to.be.equal("11, nya")
		expect(parent()[1]!.name).to.be.equal("11")
		expect(lastValue).to.be.equal(view1())
		expect(callCount).to.be.equal(1)

		unsub()
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(view1()).to.be.equal("11, nya")
		expect(callCount).to.be.equal(1)
	})

	test("arraywrap and viewbox chain with sub different throw", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}]) as WBoxInternal<{id: number, name: string}[]>
		const wrap = parent.wrapElements(el => el.id)
		const box1 = wrap()[0]!
		const view1 = viewBox(() => box1().name + ", nya")

		expect(parent.haveSubscribers()).to.be.equal(false)
		let lastValue = view1()
		let callCount = 0
		view1.subscribe(v => {
			lastValue = v
			callCount++
		})

		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(view1()).to.be.equal("1, nya")
		expect(parent()[0]!.name).to.be.equal("1")
		expect(lastValue).to.be.equal(view1())
		expect(callCount).to.be.equal(0)

		parent([{id: 1, name: "11"}, parent()[1]!])
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(view1()).to.be.equal("11, nya")
		expect(parent()[0]!.name).to.be.equal("11")
		expect(lastValue).to.be.equal(view1())
		expect(callCount).to.be.equal(1)

		parent([parent()[1]!, {id: 1, name: "11"}])
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(view1()).to.be.equal("11, nya")
		expect(parent()[1]!.name).to.be.equal("11")
		expect(lastValue).to.be.equal(view1())
		expect(callCount).to.be.equal(1)

		parent([parent()[0]!])
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(view1).to.throwError(/box for key 1 is no longer attached/i)
		expect(callCount).to.be.equal(1)
	})

	test("viewbox and arraywrap chain no sub", () => {
		const parent = box({a: [{id: 1, name: "1"}]}) as WBoxInternal<{a: {id: number, name: string}[]}>
		const view = viewBox(() => parent().a)
		const wrap = view.wrapElements(el => el.id)
		const box1 = wrap()[0]!

		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(box1().name).to.be.equal("1")
		expect(box1()).to.be.equal(parent().a[0])

		parent({a: [{id: 1, name: "11"}]})
		expect(box1().name).to.be.equal("11")
		expect(box1()).to.be.equal(parent().a[0])
		expect(parent.haveSubscribers()).to.be.equal(false)

		const prop = parent.prop("a")
		prop([{id: 1, name: "111"}])
		expect(box1().name).to.be.equal("111")
		expect(box1()).to.be.equal(parent().a[0])
		expect(parent.haveSubscribers()).to.be.equal(false)

		prop([{id: 2, name: "2"}])
		expect(box1).to.throwError(/box for key 1 is no longer attached/i)
	})

	test("viewbox and arraywrap chain with sub", () => {
		const parent = box({a: [{id: 1, name: "1"}]}) as WBoxInternal<{a: {id: number, name: string}[]}>
		const view = viewBox(() => parent().a)
		const wrap = view.wrapElements(el => el.id)
		const box1 = wrap()[0]!

		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(box1().name).to.be.equal("1")
		expect(box1()).to.be.equal(parent().a[0])

		let lastValue = box1()
		let callCount = 0
		const unsub = box1.subscribe(v => {
			lastValue = v
			callCount++
		})

		expect(parent.haveSubscribers()).to.be.equal(true)
		parent({a: [{id: 1, name: "11"}]})
		expect(box1().name).to.be.equal("11")
		expect(box1()).to.be.equal(parent().a[0])
		expect(lastValue).to.be.equal(box1())
		expect(callCount).to.be.equal(1)

		expect(parent.haveSubscribers()).to.be.equal(true)
		const prop = parent.prop("a")
		prop([{id: 1, name: "111"}])
		expect(box1().name).to.be.equal("111")
		expect(box1()).to.be.equal(parent().a[0])
		expect(lastValue).to.be.equal(box1())
		expect(callCount).to.be.equal(2)

		unsub()
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(box1().name).to.be.equal("111")
		expect(box1()).to.be.equal(parent().a[0])
		expect(lastValue).to.be.equal(box1())
		expect(callCount).to.be.equal(2)
	})

	test("arraywrap of viewbox of arraywrap no sub", () => {
		const parent = box([{a: [{id: 7, name: "1"}], id: 5}]) as WBoxInternal<{id: number, a: {id: number, name: string}[]}[]>
		const firstWrap = parent.wrapElements(el => el.id)
		const firstWrapBox = firstWrap()[0]!
		const view = viewBox(() => firstWrapBox().a)
		const secondWrap = view.wrapElements(el => el.id)
		const box1 = secondWrap()[0]!

		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(box1().name).to.be.equal("1")
		expect(box1()).to.be.equal(parent()[0]!.a[0])

		parent([{a: [{id: 7, name: "2"}], id: 5}])
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(box1().name).to.be.equal("2")
		expect(box1()).to.be.equal(parent()[0]!.a[0])

		firstWrapBox({a: [{id: 7, name: "3"}], id: 5})
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(box1().name).to.be.equal("3")
		expect(box1()).to.be.equal(parent()[0]!.a[0])

		parent([{a: [{id: 7, name: "4"}], id: 6}])
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(box1).to.throwError(/box for key 5 is no longer attached/i)
	})

	test("arraywrap of viewbox of arraywrap with sub", () => {
		const parent = box([{a: [{id: 7, name: "1"}], id: 5}]) as WBoxInternal<{id: number, a: {id: number, name: string}[]}[]>
		const firstWrap = parent.wrapElements(el => el.id)
		const firstWrapBox = firstWrap()[0]!
		const view = viewBox(() => firstWrapBox().a)
		const secondWrap = view.wrapElements(el => el.id)
		const box1 = secondWrap()[0]!

		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(box1().name).to.be.equal("1")
		expect(box1()).to.be.equal(parent()[0]!.a[0])

		let lastValue = box1()
		let callCount = 0
		box1.subscribe(v => {
			lastValue = v
			callCount++
		})

		parent([{a: [{id: 7, name: "2"}], id: 5}])
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(box1().name).to.be.equal("2")
		expect(box1()).to.be.equal(parent()[0]!.a[0])
		expect(callCount).to.be.equal(1)
		expect(lastValue).to.be.equal(parent()[0]!.a[0])

		firstWrapBox({a: [{id: 7, name: "3"}], id: 5})
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(box1().name).to.be.equal("3")
		expect(box1()).to.be.equal(parent()[0]!.a[0])
		expect(callCount).to.be.equal(2)
		expect(lastValue).to.be.equal(parent()[0]!.a[0])

		parent([{a: [{id: 7, name: "4"}], id: 6}])
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(callCount).to.be.equal(2)
		expect(lastValue.name).to.be.equal("3")
		expect(box1).to.throwError(/box for key 5 is no longer attached/i)
	})

	test("arraywrap of viewbox of arraywrap with sub no throw", () => {
		const parent = box([{a: [{id: 7, name: "1"}], id: 5}]) as WBoxInternal<{id: number, a: {id: number, name: string}[]}[]>
		const firstWrap = parent.wrapElements(el => el.id)
		const firstWrapBox = firstWrap()[0]!
		const view = viewBox(() => firstWrapBox().a)
		const secondWrap = view.wrapElements(el => el.id)
		const box1 = secondWrap()[0]!

		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(box1().name).to.be.equal("1")
		expect(box1()).to.be.equal(parent()[0]!.a[0])

		let lastValue = box1()
		let callCount = 0
		const unsub = box1.subscribe(v => {
			lastValue = v
			callCount++
		})

		parent([{a: [{id: 7, name: "2"}], id: 5}])
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(box1().name).to.be.equal("2")
		expect(box1()).to.be.equal(parent()[0]!.a[0])
		expect(callCount).to.be.equal(1)
		expect(lastValue).to.be.equal(parent()[0]!.a[0])

		firstWrapBox({a: [{id: 7, name: "3"}], id: 5})
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(box1().name).to.be.equal("3")
		expect(box1()).to.be.equal(parent()[0]!.a[0])
		expect(callCount).to.be.equal(2)
		expect(lastValue).to.be.equal(parent()[0]!.a[0])

		unsub()
		expect(parent.haveSubscribers()).to.be.equal(false)
	})

	test("chain array wraps two updates no tests inbetween", () => {
		const parent = box([[{id: 1, name: "1"}]]) as WBoxInternal<{id: number, name: string}[][]>
		const wrapA = parent.wrapElements(arr => arr.length)
		const wrapB = wrapA()[0]!.wrapElements(el => el.id)
		const box1 = wrapB()[0]!

		parent([[{id: 1, name: "11"}]])
		parent([[{id: 2, name: "111"}]])
		expect(box1).to.throwError(/box for key 1 is no longer attached/i)
	})

	test("view and arraywrap item", () => {
		const parent = box([{id: 1, name: "1"}]) as WBoxInternal<{id: number, name: string}[]>
		const view = viewBox(() => parent()[0]!)
		const wrap = parent.wrapElements(el => el.id)
		const box1 = wrap()[0]!

		let lastViewValue = view()
		let viewCallCount = 0
		const unsubView = view.subscribe(v => {
			lastViewValue = v
			viewCallCount++
		})

		let lastBoxValue = box1()
		let boxCallCount = 0
		const unsubBox = box1.subscribe(v => {
			lastBoxValue = v
			boxCallCount++
		})

		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(box1()).to.be.equal(view())
		expect(box1().name).to.be.equal("1")

		parent([{id: 1, name: "11"}])
		expect(lastBoxValue).to.be.equal(view())
		expect(lastViewValue).to.be.equal(box1())
		expect(box1()).to.be.equal(view())
		expect(box1().name).to.be.equal("11")
		expect(boxCallCount).to.be.equal(1)
		expect(viewCallCount).to.be.equal(1)

		box1({id: 1, name: "111"})
		expect(lastBoxValue).to.be.equal(view())
		expect(lastViewValue).to.be.equal(box1())
		expect(box1()).to.be.equal(view())
		expect(box1().name).to.be.equal("111")
		expect(boxCallCount).to.be.equal(2)
		expect(viewCallCount).to.be.equal(2)

		box1({id: 2, name: "2"})
		expect(lastBoxValue).to.be.equal(view())
		expect(lastViewValue).to.be.equal(box1())
		expect(box1()).to.be.equal(view())
		expect(box1().name).to.be.equal("2")
		expect(boxCallCount).to.be.equal(3)
		expect(viewCallCount).to.be.equal(3)

		unsubView()
		unsubBox()
		expect(parent.haveSubscribers()).to.be.equal(false)
	})

	test("arraywrap item and view", () => {
		const parent = box([{id: 1, name: "1"}]) as WBoxInternal<{id: number, name: string}[]>
		const wrap = parent.wrapElements(el => el.id)
		const box1 = wrap()[0]!
		const view = viewBox(() => parent()[0]!)

		let lastBoxValue = box1()
		let boxCallCount = 0
		const unsubBox = box1.subscribe(v => {
			lastBoxValue = v
			boxCallCount++
		})

		let lastViewValue = view()
		let viewCallCount = 0
		const unsubView = view.subscribe(v => {
			lastViewValue = v
			viewCallCount++
		})

		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(box1()).to.be.equal(view())
		expect(box1().name).to.be.equal("1")

		parent([{id: 1, name: "11"}])
		expect(lastBoxValue).to.be.equal(view())
		expect(lastViewValue).to.be.equal(box1())
		expect(box1()).to.be.equal(view())
		expect(box1().name).to.be.equal("11")
		expect(boxCallCount).to.be.equal(1)
		expect(viewCallCount).to.be.equal(1)

		box1({id: 1, name: "111"})
		expect(lastBoxValue).to.be.equal(view())
		expect(lastViewValue).to.be.equal(box1())
		expect(box1()).to.be.equal(view())
		expect(box1().name).to.be.equal("111")
		expect(boxCallCount).to.be.equal(2)
		expect(viewCallCount).to.be.equal(2)

		box1({id: 2, name: "2"})
		expect(lastBoxValue).to.be.equal(view())
		expect(lastViewValue).to.be.equal(box1())
		expect(box1()).to.be.equal(view())
		expect(box1().name).to.be.equal("2")
		expect(boxCallCount).to.be.equal(3)
		expect(viewCallCount).to.be.equal(3)

		unsubView()
		unsubBox()
		expect(parent.haveSubscribers()).to.be.equal(false)
	})

	test("arraywrap creates new box", () => {
		const parent = box([{id: 1, name: "1"}]) as WBoxInternal<{id: number, name: string}[]>
		const wrap = parent.wrapElements(el => el.id)
		wrap.subscribe(() => {/* noop*/})
		parent([...parent(), {id: 2, name: "2"}])
		const box2 = wrap()[1]!
		box2.subscribe(() => {/* noop*/})
		parent([parent()[0]!, {id: 2, name: "3"}])
		expect(box2().name).to.be.equal("3")
	})

	test("wbox mapping after prop", () => {
		const b = box({a: 5})
		const bb = b.prop("a")
		const bbb = bb.map(x => x + 1, x => x - 1)

		expect(b().a).to.be(5)
		expect(bb()).to.be(5)
		expect(bbb()).to.be(6)

		bbb(7)
		expect(b().a).to.be(6)
		expect(bb()).to.be(6)
		expect(bbb()).to.be(7)

		b({a: 10})
		expect(b().a).to.be(10)
		expect(bb()).to.be(10)
		expect(bbb()).to.be(11)
	})

	test("wbox mapping after prop sub", () => {
		const b = box({a: 5}) as WBoxInternal<{a: number}>
		const bb = b.prop("a")
		const bbb = bb.map(x => x + 1, x => x - 1)

		expect(b.haveSubscribers()).to.be(false)

		let v: number | null = null
		const unsub = bbb.subscribe(x => v = x)

		expect(b.haveSubscribers()).to.be(true)
		expect(b().a).to.be(5)
		expect(bb()).to.be(5)
		expect(bbb()).to.be(6)
		expect(v).to.be(null)

		bbb(7)
		expect(b().a).to.be(6)
		expect(bb()).to.be(6)
		expect(bbb()).to.be(7)
		expect(v).to.be(7)

		b({a: 10})
		expect(b().a).to.be(10)
		expect(bb()).to.be(10)
		expect(bbb()).to.be(11)
		expect(v).to.be(11)

		unsub()
		expect(b.haveSubscribers()).to.be(false)
	})

	test("wbox mapping before prop", () => {
		const b = box(7)
		const bb = b.map(x => ({a: x * 2}), x => x.a / 2)
		const bbb = bb.prop("a")

		expect(b()).to.be(7)
		expect(bb().a).to.be(14)
		expect(bbb()).to.be(14)

		b(8)
		expect(b()).to.be(8)
		expect(bb().a).to.be(16)
		expect(bbb()).to.be(16)

		bbb(4)
		expect(b()).to.be(2)
		expect(bb().a).to.be(4)
		expect(bbb()).to.be(4)
	})

	test("wbox mapping before prop sub", () => {
		const b = box(7) as WBoxInternal<number>
		const bb = b.map(x => ({a: x * 2}), x => x.a / 2)
		const bbb = bb.prop("a")

		expect(b.haveSubscribers()).to.be(false)

		let v: number | null = null
		const unsub = bbb.subscribe(x => v = x)
		expect(b.haveSubscribers()).to.be(true)

		expect(b()).to.be(7)
		expect(bb().a).to.be(14)
		expect(bbb()).to.be(14)
		expect(v).to.be(null)

		b(8)
		expect(b()).to.be(8)
		expect(bb().a).to.be(16)
		expect(bbb()).to.be(16)
		expect(v).to.be(16)

		bbb(4)
		expect(b()).to.be(2)
		expect(bb().a).to.be(4)
		expect(bbb()).to.be(4)
		expect(v).to.be(4)

		unsub()
		expect(b.haveSubscribers()).to.be(false)
	})

	test("map array", () => {
		const arrBox = box([
			{id: 1, name: "1"},
			{id: 2, name: "2"},
			{id: 3, name: "3"}
		])

		const mapResult = arrBox.mapArray(item => item.id, itemBox => itemBox.map(x => JSON.stringify(x), x => JSON.parse(x)))
		const firstBox = mapResult()[0]!
		expect(firstBox()).to.be("{\"id\":1,\"name\":\"1\"}")
		firstBox("{\"id\":1,\"name\":\"uwu\"}")
		expect(arrBox()[0]).to.eql({id: 1, name: "uwu"})

		arrBox([arrBox()[1]!, arrBox()[2]!, arrBox()[0]!])
		expect(arrBox()[0]).to.eql({id: 2, name: "2"})
		expect(firstBox()).to.be("{\"id\":1,\"name\":\"uwu\"}")
		arrBox([arrBox()[0]!, arrBox()[1]!, {...arrBox()[2]!, name: "owo"}])
		expect(firstBox()).to.be("{\"id\":1,\"name\":\"owo\"}")

	})

	test("readonly array", () => {
		const roArr: readonly {id: number, name: string}[] = [
			{id: 1, name: "1"},
			{id: 2, name: "2"},
			{id: 3, name: "3"}
		]
		const arrBox = box(roArr)

		const mapResult = arrBox.mapArray(item => item.id, itemBox => itemBox.map(x => JSON.stringify(x), x => JSON.parse(x)))
		const firstBox = mapResult()[0]!
		expect(firstBox()).to.be("{\"id\":1,\"name\":\"1\"}")
		firstBox("{\"id\":1,\"name\":\"uwu\"}")
		expect(arrBox()[0]).to.eql({id: 1, name: "uwu"})
	})

	test("maparray box should throw if its value is requested while the value is being recalculated", () => {
		const urls = viewBox(() => ["1", "2", "3"])
		let maxImageHeight = 0
		const calcMaxHeight = () => {
			const imgs = images()
			maxImageHeight = imgs.reduce((a, b) => Math.max(a, b.height), 0)
		}
		const images = urls.mapArray(
			url => url,
			url => {
				const img = {width: parseInt(url()), height: parseInt(url())}
				calcMaxHeight()
				return img
			}
		)
		expect(images).to.throwError(/loop/)
		void maxImageHeight
	})

})