import {describe, test} from "@nartallax/clamsensor"
import expect from "expect.js"
import {BoxInternal, WBox, box, constBox, isConstBox, isRBox, isWBox, unbox, calcBox} from "src/internal"
import {expectExecutionTimeLessThan, makeCallCounter} from "test/test_utils"

describe("PropBox", () => {

	test("isRBox", () => {
		expect(isRBox(box({a: 5}).prop("a"))).to.be(true)
		expect(isRBox(calcBox([], () => ({a: 5})).prop("a"))).to.be(true)
		expect(isRBox(constBox({a: 5}).prop("a"))).to.be(true)
	})

	test("isWBox", () => {
		expect(isWBox(box({a: 5}).prop("a"))).to.be(true)
		expect(isWBox(calcBox([], () => ({a: 5})).prop("a"))).to.be(false)
		expect(isWBox(constBox({a: 5}).prop("a"))).to.be(false)
	})

	test("isConstBox", () => {
		expect(isConstBox(box({a: 5}).prop("a"))).to.be(false)
		expect(isConstBox(calcBox([], () => ({a: 5})).prop("a"))).to.be(false)
		expect(isConstBox(constBox({a: 5}).prop("a"))).to.be(true)
	})

	test("unbox", () => {
		expect(unbox(box({a: 5}).prop("a"))).to.be(5)
		expect(unbox(calcBox([], () => ({a: 5})).prop("a"))).to.be(5)
		expect(unbox(constBox({a: 5}).prop("a"))).to.be(5)
	})

	test("toString", () => {
		const a = box({a: 5}).prop("a")
		const b = calcBox([], () => ({a: 5})).prop("a")
		const c = constBox({a: 5}).prop("a")
		expect(a + "").to.be("PropBox(Symbol(AbsentBoxValue))")
		expect(b + "").to.be("PropBox(Symbol(AbsentBoxValue))")
		expect(c + "").to.be("ConstBox(5)")
		a.get()
		b.get()
		c.get()
		expect(a + "").to.be("PropBox(5)")
		expect(b + "").to.be("PropBox(5)")
		expect(c + "").to.be("ConstBox(5)")
	})

	test("moves value back and forth", () => {
		const parent = box({a: 5})
		const child = parent.prop("a")

		expect(child.get()).to.be.equal(5)
		child.set(6)
		expect(child.get()).to.be.equal(6)
		expect(parent.get().a).to.be.equal(6)

		const counter = makeCallCounter()
		child.subscribe(counter)
		expect(counter.lastCallValue).to.be.equal(null)
		expect(counter.callCount).to.be.equal(0)

		child.set(7)
		expect(counter.lastCallValue).to.be.equal(7)
		expect(counter.callCount).to.be.equal(1)

		parent.set({a: 8})
		expect(counter.lastCallValue).to.be.equal(8)
		expect(counter.callCount).to.be.equal(2)
	})

	test("properly ignores unrelated updates", () => {
		const parent = box({a: {c: 5}, b: {d: "uwu"}})
		const childA = parent.prop("a")
		const childB = parent.prop("b")

		const parentCounter = makeCallCounter()
		parent.subscribe(parentCounter)
		const childACounter = makeCallCounter()
		childA.subscribe(childACounter)
		const childBCounter = makeCallCounter()
		childB.subscribe(childBCounter)
		expect(childACounter.callCount).to.be.equal(0)
		expect(childBCounter.callCount).to.be.equal(0)

		childA.set({c: 10})
		expect(parentCounter.callCount).to.be.equal(1)
		expect(childACounter.callCount).to.be.equal(1)
		expect(childBCounter.callCount).to.be.equal(0)

		childB.set({d: "owo"})
		expect(parentCounter.callCount).to.be.equal(2)
		expect(childACounter.callCount).to.be.equal(1)
		expect(childBCounter.callCount).to.be.equal(1)

		parent.set({a: {c: 15}, b: {d: "x_x"}})
		expect(parentCounter.callCount).to.be.equal(3)
		expect(childACounter.callCount).to.be.equal(2)
		expect(childBCounter.callCount).to.be.equal(2)
	})

	test("chain", () => {
		const parent = box({a: {b: {c: 5}}})
		const middle = parent.prop("a")
		const child = middle.prop("b")
		const parentCounter = makeCallCounter()
		parent.subscribe(parentCounter)
		const childCounter = makeCallCounter()
		child.subscribe(childCounter)
		const middleCounter = makeCallCounter()
		middle.subscribe(middleCounter)

		expect(parentCounter.callCount).to.be.equal(0)
		expect(childCounter.callCount).to.be.equal(0)
		expect(parent.get().a.b.c).to.be.equal(5)
		expect(child.get().c).to.be.equal(5)

		child.set({c: 10})
		expect(parentCounter.callCount).to.be.equal(1)
		expect(childCounter.callCount).to.be.equal(1)
		expect(parent.get().a.b.c).to.be.equal(10)
		expect(child.get().c).to.be.equal(10)

		parent.set({a: {b: {c: 15}}})
		expect(parentCounter.callCount).to.be.equal(2)
		expect(childCounter.callCount).to.be.equal(2)
		expect(parent.get().a.b.c).to.be.equal(15)
		expect(child.get().c).to.be.equal(15)

		middle.set({b: {c: 20}})
		expect(parentCounter.callCount).to.be.equal(3)
		expect(childCounter.callCount).to.be.equal(3)
		expect(parent.get().a.b.c).to.be.equal(20)
		expect(child.get().c).to.be.equal(20)

		parent.unsubscribe(parentCounter)
		child.unsubscribe(childCounter)
		middle.unsubscribe(middleCounter)

		child.set({c: 10})
		expect(parentCounter.callCount).to.be.equal(3)
		expect(childCounter.callCount).to.be.equal(3)
		expect(parent.get().a.b.c).to.be.equal(10)
		expect(child.get().c).to.be.equal(10)

		parent.set({a: {b: {c: 15}}})
		expect(parentCounter.callCount).to.be.equal(3)
		expect(childCounter.callCount).to.be.equal(3)
		expect(parent.get().a.b.c).to.be.equal(15)
		expect(child.get().c).to.be.equal(15)

		middle.set({b: {c: 20}})
		expect(parentCounter.callCount).to.be.equal(3)
		expect(childCounter.callCount).to.be.equal(3)
		expect(parent.get().a.b.c).to.be.equal(20)
		expect(child.get().c).to.be.equal(20)
	})

	test("chain with middle implicit subscription", () => {
		const parent = box({a: {b: {c: 5}}})
		const middle = parent.prop("a")
		const child = middle.prop("b")
		const parentCounter = makeCallCounter()
		parent.subscribe(parentCounter)
		const childCounter = makeCallCounter()
		child.subscribe(childCounter)

		expect(parentCounter.callCount).to.be.equal(0)
		expect(childCounter.callCount).to.be.equal(0)
		expect(parent.get().a.b.c).to.be.equal(5)
		expect(child.get().c).to.be.equal(5)

		child.set({c: 10})
		expect(parentCounter.callCount).to.be.equal(1)
		expect(childCounter.callCount).to.be.equal(1)
		expect(parent.get().a.b.c).to.be.equal(10)
		expect(child.get().c).to.be.equal(10)

		parent.set({a: {b: {c: 15}}})
		expect(parentCounter.callCount).to.be.equal(2)
		expect(childCounter.callCount).to.be.equal(2)
		expect(parent.get().a.b.c).to.be.equal(15)
		expect(child.get().c).to.be.equal(15)

		middle.set({b: {c: 20}})
		expect(parentCounter.callCount).to.be.equal(3)
		expect(childCounter.callCount).to.be.equal(3)
		expect(parent.get().a.b.c).to.be.equal(20)
		expect(child.get().c).to.be.equal(20)

		parent.unsubscribe(parentCounter)
		child.unsubscribe(childCounter)

		child.set({c: 10})
		expect(parentCounter.callCount).to.be.equal(3)
		expect(childCounter.callCount).to.be.equal(3)
		expect(parent.get().a.b.c).to.be.equal(10)
		expect(child.get().c).to.be.equal(10)

		parent.set({a: {b: {c: 15}}})
		expect(parentCounter.callCount).to.be.equal(3)
		expect(childCounter.callCount).to.be.equal(3)
		expect(parent.get().a.b.c).to.be.equal(15)
		expect(child.get().c).to.be.equal(15)

		middle.set({b: {c: 20}})
		expect(parentCounter.callCount).to.be.equal(3)
		expect(childCounter.callCount).to.be.equal(3)
		expect(parent.get().a.b.c).to.be.equal(20)
		expect(child.get().c).to.be.equal(20)
	})

	test("chain with only top sub", () => {
		const parent = box({a: {b: {c: 5}}})
		const middle = parent.prop("a")
		const child = middle.prop("b")
		const parentCounter = makeCallCounter()
		parent.subscribe(parentCounter)

		expect(parentCounter.callCount).to.be.equal(0)
		expect(parent.get().a.b.c).to.be.equal(5)
		expect(child.get().c).to.be.equal(5)

		child.set({c: 10})
		expect(parentCounter.callCount).to.be.equal(1)
		expect(parent.get().a.b.c).to.be.equal(10)
		expect(child.get().c).to.be.equal(10)

		parent.set({a: {b: {c: 15}}})
		expect(parentCounter.callCount).to.be.equal(2)
		expect(parent.get().a.b.c).to.be.equal(15)
		expect(child.get().c).to.be.equal(15)
		expect(parentCounter.callCount).to.be.equal(2)

		middle.set({b: {c: 20}})
		expect(parentCounter.callCount).to.be.equal(3)
		expect(parent.get().a.b.c).to.be.equal(20)
		expect(child.get().c).to.be.equal(20)

		parent.unsubscribe(parentCounter)

		child.set({c: 10})
		expect(parentCounter.callCount).to.be.equal(3)
		expect(parent.get().a.b.c).to.be.equal(10)
		expect(child.get().c).to.be.equal(10)

		parent.set({a: {b: {c: 15}}})
		expect(parentCounter.callCount).to.be.equal(3)
		expect(parent.get().a.b.c).to.be.equal(15)
		expect(child.get().c).to.be.equal(15)

		middle.set({b: {c: 20}})
		expect(parentCounter.callCount).to.be.equal(3)
		expect(parent.get().a.b.c).to.be.equal(20)
		expect(child.get().c).to.be.equal(20)
	})

	test("chain with only bottom sub", () => {
		const parent = box({a: {b: {c: 5}}})
		const middle = parent.prop("a")
		const child = middle.prop("b")
		const counter = makeCallCounter()
		child.subscribe(counter)

		expect(counter.callCount).to.be.equal(0)
		expect(parent.get().a.b.c).to.be.equal(5)
		expect(child.get().c).to.be.equal(5)

		child.set({c: 10})
		expect(counter.callCount).to.be.equal(1)
		expect(parent.get().a.b.c).to.be.equal(10)
		expect(child.get().c).to.be.equal(10)

		parent.set({a: {b: {c: 15}}})
		expect(counter.callCount).to.be.equal(2)
		expect(parent.get().a.b.c).to.be.equal(15)
		expect(child.get().c).to.be.equal(15)

		middle.set({b: {c: 20}})
		expect(counter.callCount).to.be.equal(3)
		expect(parent.get().a.b.c).to.be.equal(20)
		expect(child.get().c).to.be.equal(20)

		child.unsubscribe(counter)

		child.set({c: 10})
		expect(counter.callCount).to.be.equal(3)
		expect(parent.get().a.b.c).to.be.equal(10)
		expect(child.get().c).to.be.equal(10)

		parent.set({a: {b: {c: 15}}})
		expect(counter.callCount).to.be.equal(3)
		expect(parent.get().a.b.c).to.be.equal(15)
		expect(child.get().c).to.be.equal(15)

		middle.set({b: {c: 20}})
		expect(counter.callCount).to.be.equal(3)
		expect(parent.get().a.b.c).to.be.equal(20)
		expect(child.get().c).to.be.equal(20)
	})

	test("calc only subscribes to prop box, not to the parent box", () => {
		const parent = box({a: 5})
		const child = parent.prop("a")
		const parentCounter = makeCallCounter()
		parent.subscribe(parentCounter)
		const childCounter = makeCallCounter()
		child.subscribe(childCounter)
		let calcCount = 0
		const calc = calcBox([child], child => {
			calcCount++
			return child * 2
		})
		calc.subscribe(() => {
			// nothing
		})

		expect(calcCount).to.be.equal(1)
		expect(parentCounter.callCount).to.be.equal(0)
		expect(childCounter.callCount).to.be.equal(0)

		parent.set({a: 6})
		expect(calcCount).to.be.equal(2)
		expect(parentCounter.callCount).to.be.equal(1)
		expect(childCounter.callCount).to.be.equal(1)

		parent.set({a: 6})
		expect(calcCount).to.be.equal(2)
		expect(parentCounter.callCount).to.be.equal(2)
		expect(childCounter.callCount).to.be.equal(1)
	})

	test("same-field prop boxes", () => {
		const p = box({a: 5})
		const a = p.prop("a")
		const b = p.prop("a")

		expect(a.get()).to.be.equal(5)
		expect(b.get()).to.be.equal(5)

		a.set(6)
		expect(a.get()).to.be.equal(6)
		expect(b.get()).to.be.equal(6)
		expect(p.get().a).to.be.equal(6)

		b.set(7)
		expect(a.get()).to.be.equal(7)
		expect(b.get()).to.be.equal(7)
		expect(p.get().a).to.be.equal(7)

		const counter = makeCallCounter()
		b.subscribe(counter)
		expect(counter.callCount).to.be.equal(0)
		expect(counter.lastCallValue).to.be.equal(null)
		a.set(8)
		expect(a.get()).to.be.equal(8)
		expect(b.get()).to.be.equal(8)
		expect(counter.callCount).to.be.equal(1)
		expect(counter.lastCallValue).to.be.equal(8)
		b.set(9)
		expect(a.get()).to.be.equal(9)
		expect(b.get()).to.be.equal(9)
		expect(counter.callCount).to.be.equal(2)
		expect(counter.lastCallValue).to.be.equal(9)
		p.set({a: 10})
		expect(a.get()).to.be.equal(10)
		expect(b.get()).to.be.equal(10)
		expect(counter.callCount).to.be.equal(3)
		expect(counter.lastCallValue).to.be.equal(10)

		b.unsubscribe(counter)
		expect(counter.callCount).to.be.equal(3)
		expect(counter.lastCallValue).to.be.equal(10)
		a.set(11)
		expect(counter.callCount).to.be.equal(3)
		expect(counter.lastCallValue).to.be.equal(10)
		expect(a.get()).to.be.equal(11)
		expect(b.get()).to.be.equal(11)
		expect(p.get().a).to.be.equal(11)
	})

	test("prop of calcbox", () => {
		const parent = box({a: 5}) as BoxInternal<{a: number}>
		const calc = calcBox([parent], x => ({...x, b: x.a * 2})) as BoxInternal<{a: number, b: number}>
		const propA1 = calc.prop("a") as BoxInternal<number>
		const propA2 = calc.prop("a") as BoxInternal<number>
		const propB = calc.prop("b") as BoxInternal<number>

		expect(propA1.get()).to.be.equal(5)
		expect(propA2.get()).to.be.equal(5)
		expect(propB.get()).to.be.equal(10)
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(calc.haveSubscribers()).to.be.equal(false)
		expect(propA1.haveSubscribers()).to.be.equal(false)
		expect(propA2.haveSubscribers()).to.be.equal(false)
		expect(propB.haveSubscribers()).to.be.equal(false)

		parent.set({a: 6})

		expect(propA1.get()).to.be.equal(6)
		expect(propA2.get()).to.be.equal(6)
		expect(propB.get()).to.be.equal(12)
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(calc.haveSubscribers()).to.be.equal(false)
		expect(propA1.haveSubscribers()).to.be.equal(false)
		expect(propA2.haveSubscribers()).to.be.equal(false)
		expect(propB.haveSubscribers()).to.be.equal(false)

		const counter = makeCallCounter()
		propA1.subscribe(counter)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(calc.haveSubscribers()).to.be.equal(true)
		expect(propA1.haveSubscribers()).to.be.equal(true)
		expect(propA2.haveSubscribers()).to.be.equal(false)
		expect(propB.haveSubscribers()).to.be.equal(false)

		parent.set({a: 7})
		expect(propA1.get()).to.be.equal(7)
		expect(counter.callCount).to.be.equal(1)

		parent.set({a: 8})
		expect(propA1.get()).to.be.equal(8)
		expect(counter.callCount).to.be.equal(2)

		propA1.unsubscribe(counter)
		parent.set({a: 9})
		expect(propA1.get()).to.be.equal(9)
		expect(counter.callCount).to.be.equal(2)
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(calc.haveSubscribers()).to.be.equal(false)
		expect(propA1.haveSubscribers()).to.be.equal(false)
		expect(propA2.haveSubscribers()).to.be.equal(false)
		expect(propB.haveSubscribers()).to.be.equal(false)
	})

	test("unsubscribing properly", () => {
		const parent = box({a: 5}) as BoxInternal<{a: number}>
		const child = parent.prop("a") as BoxInternal<number>

		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(child.haveSubscribers()).to.be.equal(false)

		parent.set({a: 6})
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(child.haveSubscribers()).to.be.equal(false)
		expect(child.get()).to.be.equal(6)
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(child.haveSubscribers()).to.be.equal(false)

		child.set(7)
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(child.haveSubscribers()).to.be.equal(false)
		expect(parent.get().a).to.be.equal(7)
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(child.haveSubscribers()).to.be.equal(false)

		const parentCounter = makeCallCounter()
		parent.subscribe(parentCounter)
		expect(parentCounter.callCount).to.be.equal(0)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(child.haveSubscribers()).to.be.equal(false)
		expect(child.get()).to.be.equal(7)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(child.haveSubscribers()).to.be.equal(false)

		parent.set({a: 8})
		expect(parentCounter.callCount).to.be.equal(1)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(child.haveSubscribers()).to.be.equal(false)
		expect(child.get()).to.be.equal(8)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(child.haveSubscribers()).to.be.equal(false)

		const childCounter = makeCallCounter()
		child.subscribe(childCounter)
		expect(parentCounter.callCount).to.be.equal(1)
		expect(childCounter.callCount).to.be.equal(0)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(child.haveSubscribers()).to.be.equal(true)

		child.set(9)
		expect(parentCounter.callCount).to.be.equal(2)
		expect(childCounter.callCount).to.be.equal(1)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(child.haveSubscribers()).to.be.equal(true)
		expect(child.get()).to.be.equal(9)
		expect(parent.get().a).to.be.equal(9)

		parent.unsubscribe(parentCounter)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(child.haveSubscribers()).to.be.equal(true)

		child.unsubscribe(childCounter)
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(child.haveSubscribers()).to.be.equal(false)
	})

	test("chain propboxes are unsubscribing properly", () => {
		const parent = box({a: {b: 5}}) as BoxInternal<{a: {b: number}}>
		const middle = parent.prop("a") as BoxInternal<{b: number}>
		const child = middle.prop("b") as BoxInternal<number>

		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(child.haveSubscribers()).to.be.equal(false)

		parent.set({a: {b: 6}})
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(child.haveSubscribers()).to.be.equal(false)
		expect(child.get()).to.be.equal(6)
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(child.haveSubscribers()).to.be.equal(false)

		child.set(7)
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(child.haveSubscribers()).to.be.equal(false)
		expect(parent.get().a.b).to.be.equal(7)
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(child.haveSubscribers()).to.be.equal(false)

		const parentCounter = makeCallCounter()
		parent.subscribe(parentCounter)
		expect(parentCounter.callCount).to.be.equal(0)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(child.haveSubscribers()).to.be.equal(false)
		expect(child.get()).to.be.equal(7)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(child.haveSubscribers()).to.be.equal(false)

		parent.set({a: {b: 8}})
		expect(parentCounter.callCount).to.be.equal(1)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(child.haveSubscribers()).to.be.equal(false)
		expect(child.get()).to.be.equal(8)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(child.haveSubscribers()).to.be.equal(false)

		const childCounter = makeCallCounter()
		child.subscribe(childCounter)
		expect(parentCounter.callCount).to.be.equal(1)
		expect(childCounter.callCount).to.be.equal(0)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(child.haveSubscribers()).to.be.equal(true)

		child.set(9)
		expect(parentCounter.callCount).to.be.equal(2)
		expect(childCounter.callCount).to.be.equal(1)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(child.haveSubscribers()).to.be.equal(true)
		expect(child.get()).to.be.equal(9)
		expect(parent.get().a.b).to.be.equal(9)

		parent.unsubscribe(parentCounter)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(child.haveSubscribers()).to.be.equal(true)

		child.unsubscribe(childCounter)
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(child.haveSubscribers()).to.be.equal(false)
	})

	test("wbox mapping after prop", () => {
		const b = box({a: 5})
		const bb = b.prop("a")
		const bbb = bb.map(x => x + 1, x => x - 1)

		expect(b.get().a).to.be(5)
		expect(bb.get()).to.be(5)
		expect(bbb.get()).to.be(6)

		bbb.set(7)
		expect(b.get().a).to.be(6)
		expect(bb.get()).to.be(6)
		expect(bbb.get()).to.be(7)

		b.set({a: 10})
		expect(b.get().a).to.be(10)
		expect(bb.get()).to.be(10)
		expect(bbb.get()).to.be(11)
	})

	test("wbox mapping after prop sub", () => {
		const b = box({a: 5}) as BoxInternal<{a: number}>
		const bb = b.prop("a")
		const bbb = bb.map(x => x + 1, x => x - 1)

		expect(b.haveSubscribers()).to.be(false)

		const counter = makeCallCounter()
		bbb.subscribe(counter)

		expect(b.haveSubscribers()).to.be(true)
		expect(b.get().a).to.be(5)
		expect(bb.get()).to.be(5)
		expect(bbb.get()).to.be(6)
		expect(counter.lastCallValue).to.be(null)

		bbb.set(7)
		expect(b.get().a).to.be(6)
		expect(bb.get()).to.be(6)
		expect(bbb.get()).to.be(7)
		expect(counter.lastCallValue).to.be(7)

		b.set({a: 10})
		expect(b.get().a).to.be(10)
		expect(bb.get()).to.be(10)
		expect(bbb.get()).to.be(11)
		expect(counter.lastCallValue).to.be(11)

		bbb.unsubscribe(counter)
		expect(b.haveSubscribers()).to.be(false)
	})

	test("wbox mapping before prop", () => {
		const b = box(7)
		const bb = b.map(x => ({a: x * 2}), x => x.a / 2)
		const bbb = bb.prop("a")

		expect(b.get()).to.be(7)
		expect(bb.get().a).to.be(14)
		expect(bbb.get()).to.be(14)

		b.set(8)
		expect(b.get()).to.be(8)
		expect(bb.get().a).to.be(16)
		expect(bbb.get()).to.be(16)

		bbb.set(4)
		expect(b.get()).to.be(2)
		expect(bb.get().a).to.be(4)
		expect(bbb.get()).to.be(4)
	})

	test("wbox mapping before prop sub", () => {
		const b = box(7) as BoxInternal<number>
		const bb = b.map(x => ({a: x * 2}), x => x.a / 2)
		const bbb = bb.prop("a")

		expect(b.haveSubscribers()).to.be(false)

		const counter = makeCallCounter()
		bbb.subscribe(counter)
		expect(b.haveSubscribers()).to.be(true)

		expect(b.get()).to.be(7)
		expect(bb.get().a).to.be(14)
		expect(bbb.get()).to.be(14)
		expect(counter.lastCallValue).to.be(null)

		b.set(8)
		expect(b.get()).to.be(8)
		expect(bb.get().a).to.be(16)
		expect(bbb.get()).to.be(16)
		expect(counter.lastCallValue).to.be(16)

		bbb.set(4)
		expect(b.get()).to.be(2)
		expect(bb.get().a).to.be(4)
		expect(bbb.get()).to.be(4)
		expect(counter.lastCallValue).to.be(4)

		bbb.unsubscribe(counter)
		expect(b.haveSubscribers()).to.be(false)
	})

	test("performance: update of property box does not check for update of other property boxes", () => {
		const fieldCount = 100
		const cycles = 1000

		const obj: Record<string, number> = {}
		for(let i = 0; i < fieldCount; i++){
			obj["_" + i] = i
		}

		const counter = makeCallCounter()
		const sourceBox = box(obj)
		const propBoxes: WBox<number>[] = []
		for(let i = 0; i < fieldCount; i++){
			const propBox = sourceBox.prop("_" + i)
			propBox.subscribe(counter)
			propBoxes.push(propBox)
		}

		// not very robust... on some machines this could pass just because the machine is fast
		expectExecutionTimeLessThan(400, 600, () => {
			for(let cycle = 0; cycle < cycles; cycle++){
				for(const propBox of propBoxes){
					const newValue = propBox.get() + 1
					propBox.set(newValue)
				}
			}
		})
	})

	test("setProp method", () => {
		const b = box({a: 5})
		const bb = b.prop("a")

		const parentCounter = makeCallCounter()
		b.subscribe(parentCounter)

		const childCounter = makeCallCounter()
		bb.subscribe(childCounter)

		b.setProp("a", 6)
		expect(parentCounter.callCount).to.be(1)
		expect(parentCounter.lastCallValue).to.eql({a: 6})
		expect(childCounter.callCount).to.be(1)
		expect(childCounter.lastCallValue).to.be(6)

		b.setProp("a", 6)
		expect(parentCounter.callCount).to.be(1)
		expect(parentCounter.lastCallValue).to.eql({a: 6})
		expect(childCounter.callCount).to.be(1)
		expect(childCounter.lastCallValue).to.be(6)
	})

})