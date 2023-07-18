import {describe, test} from "@nartallax/clamsensor"
import expect from "expect.js"
import {RBoxInternal, WBoxInternal, box, constBox, isConstBox, isRBox, isWBox, unbox, viewBox} from "src/new/internal"
import {makeCallCounter} from "test/test_utils"

describe("PropBox", () => {

	test("isRBox", () => {
		expect(isRBox(box({a: 5}).prop("a"))).to.be(true)
		expect(isRBox(viewBox(() => ({a: 5})).prop("a"))).to.be(true)
		expect(isRBox(constBox({a: 5}).prop("a"))).to.be(true)
	})

	test("isWBox", () => {
		expect(isWBox(box({a: 5}).prop("a"))).to.be(true)
		expect(isWBox(viewBox(() => ({a: 5})).prop("a"))).to.be(false)
		expect(isWBox(constBox({a: 5}).prop("a"))).to.be(false)
	})

	test("isConstBox", () => {
		expect(isConstBox(box({a: 5}).prop("a"))).to.be(false)
		expect(isConstBox(viewBox(() => ({a: 5})).prop("a"))).to.be(false)
		expect(isConstBox(constBox({a: 5}).prop("a"))).to.be(true)
	})

	test("unbox", () => {
		expect(unbox(box({a: 5}).prop("a"))).to.be(5)
		expect(unbox(viewBox(() => ({a: 5})).prop("a"))).to.be(5)
		expect(unbox(constBox({a: 5}).prop("a"))).to.be(5)
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

	test("view only subscribes to prop box, not to the parent box", () => {
		const parent = box({a: 5})
		const child = parent.prop("a")
		const parentCounter = makeCallCounter()
		parent.subscribe(parentCounter)
		const childCounter = makeCallCounter()
		child.subscribe(childCounter)
		let calcCount = 0
		const view = viewBox(() => {
			calcCount++
			return child.get() * 2
		})
		view.subscribe(() => {
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

	test("prop of viewbox", () => {
		const parent = box({a: 5}) as WBoxInternal<{a: number}>
		const view = viewBox(() => ({...parent.get(), b: parent.get().a * 2})) as RBoxInternal<{a: number, b: number}>
		const propA1 = view.prop("a") as RBoxInternal<number>
		const propA2 = view.prop("a") as RBoxInternal<number>
		const propB = view.prop("b") as RBoxInternal<number>

		expect(propA1.get()).to.be.equal(5)
		expect(propA2.get()).to.be.equal(5)
		expect(propB.get()).to.be.equal(10)
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(view.haveSubscribers()).to.be.equal(false)
		expect(propA1.haveSubscribers()).to.be.equal(false)
		expect(propA2.haveSubscribers()).to.be.equal(false)
		expect(propB.haveSubscribers()).to.be.equal(false)

		parent.set({a: 6})

		expect(propA1.get()).to.be.equal(6)
		expect(propA2.get()).to.be.equal(6)
		expect(propB.get()).to.be.equal(12)
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(view.haveSubscribers()).to.be.equal(false)
		expect(propA1.haveSubscribers()).to.be.equal(false)
		expect(propA2.haveSubscribers()).to.be.equal(false)
		expect(propB.haveSubscribers()).to.be.equal(false)

		const counter = makeCallCounter()
		propA1.subscribe(counter)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(view.haveSubscribers()).to.be.equal(true)
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
		expect(view.haveSubscribers()).to.be.equal(false)
		expect(propA1.haveSubscribers()).to.be.equal(false)
		expect(propA2.haveSubscribers()).to.be.equal(false)
		expect(propB.haveSubscribers()).to.be.equal(false)
	})

	test("unsubscribing properly", () => {
		const parent = box({a: 5}) as WBoxInternal<{a: number}>
		const child = parent.prop("a") as WBoxInternal<number>

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
		const parent = box({a: {b: 5}}) as WBoxInternal<{a: {b: number}}>
		const middle = parent.prop("a") as WBoxInternal<{b: number}>
		const child = middle.prop("b") as WBoxInternal<number>

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

})