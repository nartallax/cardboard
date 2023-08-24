import {describe, test} from "@nartallax/clamsensor"
import expect from "expect.js"
import {isConstBox, isRBox, isWBox, unbox, box, BoxInternal, constBox, calcBox} from "src/internal"
import {makeCallCounter} from "test/test_utils"

describe("MapBox", () => {

	test("isRBox", () => {
		expect(isRBox(box(5).map(x => x + 1, x => x - 1))).to.be(true)
		// this is not technically MapBox, but belongs here anyway
		expect(isRBox(box(5).map(x => x + 1))).to.be(true)
		expect(isRBox(calcBox([], () => 5).map(x => x + 1))).to.be(true)
		expect(isRBox(constBox(5).map(x => x + 1))).to.be(true)
	})

	test("isWBox", () => {
		expect(isWBox(box(5).map(x => x + 1, x => x - 1))).to.be(true)
		expect(isWBox(box(5).map(x => x + 1))).to.be(false)
		expect(isWBox(calcBox([], () => 5).map(x => x + 1))).to.be(false)
		expect(isWBox(constBox(5).map(x => x + 1))).to.be(false)
	})

	test("isConstBox", () => {
		expect(isConstBox(box(5).map(x => x + 1, x => x - 1))).to.be(false)
		expect(isConstBox(box(5).map(x => x + 1))).to.be(false)
		expect(isConstBox(calcBox([], () => 5).map(x => x + 1))).to.be(false)
		expect(isConstBox(constBox(5).map(x => x + 1))).to.be(true)
	})

	test("unbox", () => {
		expect(unbox(box(5).map(x => x + 1, x => x - 1))).to.be(6)
		expect(unbox(box(5).map(x => x + 1))).to.be(6)
		expect(unbox(calcBox([], () => 5).map(x => x + 1))).to.be(6)
		expect(unbox(constBox(5).map(x => x + 1))).to.be(6)
	})

	test("toString", () => {
		const a = box(5).map(x => x + 1, x => x - 1)
		const b = box(5).map(x => x + 1)
		const c = calcBox([], () => 5).map(x => x + 1)
		const d = constBox(5).map(x => x + 1)
		expect(a + "").to.be("MapBox(Symbol(AbsentBoxValue))")
		expect(b + "").to.be("MapBox(Symbol(AbsentBoxValue))")
		expect(c + "").to.be("MapBox(Symbol(AbsentBoxValue))")
		expect(d + "").to.be("ConstBox(6)")
		a.get()
		b.get()
		c.get()
		d.get()
		expect(a + "").to.be("MapBox(6)")
		expect(b + "").to.be("MapBox(6)")
		expect(c + "").to.be("MapBox(6)")
		expect(d + "").to.be("ConstBox(6)")
	})

	test("propagates value back and forth", () => {
		const b = box(1)
		const bb = b.map(x => x * 2, x => x / 2)

		expect(b.get()).to.be(1)
		expect(bb.get()).to.be(2)

		b.set(2)
		expect(b.get()).to.be(2)
		expect(bb.get()).to.be(4)

		bb.set(12)
		expect(b.get()).to.be(6)
		expect(bb.get()).to.be(12)
	})

	test("calls subscribers and unsubscribes from upstream when unsubscribed from", () => {
		const b = box(1) as BoxInternal<number>
		const bb = b.map(x => x * 2, x => x / 2)

		expect(b.haveSubscribers()).to.be(false)
		const counter = makeCallCounter()
		bb.subscribe(counter)

		expect(b.haveSubscribers()).to.be(true)
		expect(b.get()).to.be(1)
		expect(bb.get()).to.be(2)
		expect(counter.lastCallValue).to.be(null)

		b.set(2)
		expect(b.get()).to.be(2)
		expect(bb.get()).to.be(4)
		expect(counter.lastCallValue).to.be(4)

		bb.set(12)
		expect(b.get()).to.be(6)
		expect(bb.get()).to.be(12)
		expect(counter.lastCallValue).to.be(12)

		bb.unsubscribe(counter)
		expect(b.haveSubscribers()).to.be(false)
	})

	test("only invokes actual mapper if source value changed", () => {
		const a = box(5)
		let directCalls = 0
		let reverseCalls = 0
		const b = a.map(aVal => {
			directCalls++
			return aVal * 2
		}, bVal => {
			reverseCalls++
			return bVal / 2
		})

		expect({directCalls}).to.eql({directCalls: 0})
		expect({reverseCalls}).to.eql({reverseCalls: 0})

		expect(b.get()).to.be(10)
		expect({directCalls}).to.eql({directCalls: 1})
		expect({reverseCalls}).to.eql({reverseCalls: 0})

		expect(b.get()).to.be(10)
		expect({directCalls}).to.eql({directCalls: 1})
		expect({reverseCalls}).to.eql({reverseCalls: 0})

		b.set(30)
		expect(a.get()).to.be(15)
		expect({directCalls}).to.eql({directCalls: 1})
		expect({reverseCalls}).to.eql({reverseCalls: 1})

		b.set(30)
		expect(a.get()).to.be(15)
		expect({directCalls}).to.eql({directCalls: 1})
		expect({reverseCalls}).to.eql({reverseCalls: 1})
	})

	test("will recalculate value after unsub and resub", () => {
		// old test. not sure what exactly is being tested here, but oh well, lets keep it
		const noop = () => { /* nothing */}

		const srcArray = box([1, 2, 3])
		const firstMappedArray = srcArray.map(srcArray => srcArray.map(x => x * 2))
		const secondMappedArray = firstMappedArray.map(srcArray => srcArray.map(x => x + 1))
		secondMappedArray.subscribe(noop)
		expect(secondMappedArray.get()).to.eql([3, 5, 7])
		secondMappedArray.unsubscribe(noop)
		secondMappedArray.subscribe(noop)
		expect(secondMappedArray.get()).to.eql([3, 5, 7])
	})

	test("receives updates when upstream is returned back to starting value", () => {
		const px = box("3px")

		let first = 0
		let second = 0
		px.subscribe(() => first++)
		px.subscribe(() => second++)

		const abs = px.map(str => parseInt(str), num => num + "px")
		let lastKnownValue = -1
		abs.subscribe(newValue => lastKnownValue = newValue)
		abs.set(4)
		expect(px.get()).to.be("4px")
		expect(first).to.be(1)
		expect(second).to.be(1)
		expect(lastKnownValue).to.be(4)
		px.set("3px")
		expect(first).to.be(2)
		expect(second).to.be(2)
		expect(lastKnownValue).to.be(3)
	})

	test("when double-notified, should still propagate value to upstream", () => {
		const a = box(5)
		const b = a.map(x => x + 1, x => x - 1)
		b.subscribe(x => b.set(x | 1))

		b.set(2)
		expect(a.get()).to.be(2)
	})

	test("if value is changed during subscription - it should be updated", () => {
		const base = box(5)

		const b1 = base.map(x => {
			base.set(x & (~1))
			return x
		})

		b1.subscribe(makeCallCounter("b1"))

		expect(b1.get()).to.be(4)
	})

	test("map box receives meta", () => {
		const objBox = box({a: 5})
		let lastKnownMeta: any = null
		const a = objBox.map((value, meta) => {
			lastKnownMeta = meta
			return value
		})
		a.subscribe(makeCallCounter())

		objBox.setProp("a", 6)
		expect(lastKnownMeta).to.eql({type: "property_update", propName: "a"})

		const arrayBox = box([1, 2, 3])
		const b = arrayBox.map((value, meta) => {
			lastKnownMeta = meta
			return value
		})
		b.subscribe(makeCallCounter())

		arrayBox.setElementAtIndex(1, 5)
		expect(lastKnownMeta).to.eql({type: "array_item_update", index: 1, oldValue: 2})
	})

})