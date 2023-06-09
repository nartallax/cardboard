import {viewBox, box, WBox, RBox, isRBox, isWBox, unbox, constBox, isConstBox, constBoxWrap, Boxed, MRBox} from "src/cardboard"
import {describe, test} from "@nartallax/clamsensor"
import expect from "expect.js"

type RBoxInternal<T> = RBox<T> & {haveSubscribers(): boolean}
type WBoxInternal<T> = WBox<T> & RBoxInternal<T>

type CheckEquals<A, B> = A extends B ? B extends A ? true : false : false

describe("box", () => {

	test("wbox simple test", () => {
		const b = box(0)

		expect(b()).to.be.equal(0)
		expect(isRBox(b)).to.be(true)
		expect(isWBox(b)).to.be(true)
		expect(isConstBox(b)).to.be(false)
		expect(isRBox(b())).to.be(false)
		expect(isWBox(b())).to.be(false)
		expect(unbox(b)).to.be(0)

		b(5)

		expect(b()).to.be.equal(5)

		let subscriberCalledTimes = 0
		const unsub = b.subscribe(() => subscriberCalledTimes++)
		expect(subscriberCalledTimes).to.be.equal(0)

		b(10)
		expect(subscriberCalledTimes).to.be.equal(1)
		b(10)
		expect(subscriberCalledTimes).to.be.equal(1)
		b(15)
		expect(subscriberCalledTimes).to.be.equal(2)
		unsub()
		b(7)
		expect(subscriberCalledTimes).to.be.equal(2)
	})

	test("viewBox simple test", () => {
		const a = box(0)
		const b = viewBox(() => Math.floor(a() / 2))

		expect(isRBox(b)).to.be(true)
		expect(isWBox(b)).to.be(false)
		expect(isConstBox(b)).to.be(false)
		expect(isRBox(b())).to.be(false)
		expect(isWBox(b())).to.be(false)
		expect(unbox(b)).to.be(0)

		let calls = 0
		const unsub = b.subscribe(() => calls++)
		expect(calls).to.be.equal(0)
		expect(b()).to.be.equal(0)

		a(1)
		expect(b()).to.be.equal(0)
		expect(calls).to.be.equal(0)

		a(2)
		expect(b()).to.be.equal(1)
		expect(calls).to.be.equal(1)

		unsub()
		a(5)
		expect(b()).to.be.equal(2)
		expect(calls).to.be.equal(1)
	})

	test("chain subscription test", () => {
		const a = box(5)
		const b = viewBox(() => a() * 2)
		const c = viewBox(() => b() * 3)

		let successB = false
		let successC = false

		b()
		const disposeB = b.subscribe(() => {
			successB = true
		})

		c()
		const disposeC = c.subscribe(() => {
			successC = true
		})
		a(10)

		expect(a()).to.be.equal(10)
		expect(b()).to.be.equal(20)
		expect(c()).to.be.equal(60)
		expect(successB).to.be.equal(true)
		expect(successC).to.be.equal(true)

		disposeB()
		disposeC()
	})

	test("same-value notification culling", () => {
		const b = box<unknown>({a: 5})
		let calls = 0
		b.subscribe(() => calls++)
		b({a: 10})
		expect(calls).to.be.equal(1)
		b(b())
		expect(calls).to.be.equal(1)
		b(null)
		expect(calls).to.be.equal(2)
		b(null)
		expect(calls).to.be.equal(2)

		const obj = {b: 5}
		b(obj)
		expect(calls).to.be.equal(3)
		b(obj)
		expect(calls).to.be.equal(3)
		b(5)
		expect(calls).to.be.equal(4)
		b(5)
		expect(calls).to.be.equal(4)
	})

	test("view only subscribes to direct dependencies", () => {
		const a = box(5)
		let bRecalcs = 0
		const b = viewBox(() => {
			bRecalcs++
			return Math.floor(a() / 2)
		})
		let cRecalcs = 0
		const c = viewBox(() => {
			cRecalcs++
			return b() + 1
		})

		let bCalls = 0
		b.subscribe(() => bCalls++)
		let cCalls = 0
		c.subscribe(() => cCalls++)
		expect(b()).to.be.equal(2)
		expect(c()).to.be.equal(3)
		expect(bRecalcs).to.be.equal(1)
		expect(cRecalcs).to.be.equal(1)

		a(6)
		expect(bCalls).to.be.equal(1)
		expect(cCalls).to.be.equal(1)
		expect(b()).to.be.equal(3)
		expect(c()).to.be.equal(4)
		expect(bRecalcs).to.be.equal(2)
		expect(cRecalcs).to.be.equal(2)

		a(7)
		expect(bCalls).to.be.equal(1)
		expect(cCalls).to.be.equal(1)
		expect(b()).to.be.equal(3)
		expect(c()).to.be.equal(4)
		// THIS what this test is all about
		// b recalculated, but c does not
		// because c is only subscribed to b, and b did not change
		expect(bRecalcs).to.be.equal(3)
		expect(cRecalcs).to.be.equal(2)
	})

	test("subscriber does not receive outdated values", () => {
		const b = box(0)
		b.subscribe(v => b(Math.floor(v / 2) * 2))
		let lastVisibleValue = b()
		let callsCount = 0
		b.subscribe(v => {
			lastVisibleValue = v
			callsCount++
		})

		expect(callsCount).to.be.equal(0)
		b(1)
		expect(callsCount).to.be.equal(0)
		expect(lastVisibleValue).to.be.equal(0)
		b(2)
		expect(callsCount).to.be.equal(1)
		expect(lastVisibleValue).to.be.equal(2)
		b(3)
		expect(callsCount).to.be.equal(1)
		expect(lastVisibleValue).to.be.equal(2)
		b(4)
		expect(callsCount).to.be.equal(2)
		expect(lastVisibleValue).to.be.equal(4)
	})

	test("basic property subbox test", () => {
		const parent = box({a: 5})
		const child = parent.prop("a")

		expect(child()).to.be.equal(5)
		child(6)
		expect(child()).to.be.equal(6)
		expect(parent().a).to.be.equal(6)

		let calls = 0
		let lastValue = child()
		child.subscribe(v => {
			lastValue = v
			calls++
		})
		expect(lastValue).to.be.equal(6)
		expect(calls).to.be.equal(0)

		child(7)
		expect(lastValue).to.be.equal(7)
		expect(calls).to.be.equal(1)

		parent({a: 8})
		expect(lastValue).to.be.equal(8)
		expect(calls).to.be.equal(2)
	})

	test("property subbox properly ignores circular updates", () => {
		const parent = box({a: {c: 5}, b: {d: "uwu"}})
		const childA = parent.prop("a")
		const childB = parent.prop("b")

		let callsParent = 0
		parent.subscribe(() => callsParent++)
		let callsA = 0
		childA.subscribe(() => callsA++)
		let callsB = 0
		childB.subscribe(() => callsB++)
		expect(callsA).to.be.equal(0)
		expect(callsB).to.be.equal(0)

		childA({c: 10})
		expect(callsParent).to.be.equal(1)
		expect(callsA).to.be.equal(1)
		expect(callsB).to.be.equal(0)

		childB({d: "owo"})
		expect(callsParent).to.be.equal(2)
		expect(callsA).to.be.equal(1)
		expect(callsB).to.be.equal(1)

		parent({a: {c: 15}, b: {d: "x_x"}})
		expect(callsParent).to.be.equal(3)
		expect(callsA).to.be.equal(2)
		expect(callsB).to.be.equal(2)
	})

	test("chain property subboxes", () => {
		const parent = box({a: {b: {c: 5}}})
		const middle = parent.prop("a")
		const child = middle.prop("b")
		let parentCalls = 0
		const parentUnsub = parent.subscribe(() => parentCalls++)
		let childCalls = 0
		const childUnsub = child.subscribe(() => childCalls++)
		let middleCalls = 0
		const middleUnsub = middle.subscribe(() => middleCalls++)

		expect(parentCalls).to.be.equal(0)
		expect(childCalls).to.be.equal(0)
		expect(parent().a.b.c).to.be.equal(5)
		expect(child().c).to.be.equal(5)

		child({c: 10})
		expect(parentCalls).to.be.equal(1)
		expect(childCalls).to.be.equal(1)
		expect(parent().a.b.c).to.be.equal(10)
		expect(child().c).to.be.equal(10)

		parent({a: {b: {c: 15}}})
		expect(parentCalls).to.be.equal(2)
		expect(childCalls).to.be.equal(2)
		expect(parent().a.b.c).to.be.equal(15)
		expect(child().c).to.be.equal(15)

		middle({b: {c: 20}})
		expect(parentCalls).to.be.equal(3)
		expect(childCalls).to.be.equal(3)
		expect(parent().a.b.c).to.be.equal(20)
		expect(child().c).to.be.equal(20)

		parentUnsub()
		childUnsub()
		middleUnsub()

		child({c: 10})
		expect(parentCalls).to.be.equal(3)
		expect(childCalls).to.be.equal(3)
		expect(parent().a.b.c).to.be.equal(10)
		expect(child().c).to.be.equal(10)

		parent({a: {b: {c: 15}}})
		expect(parentCalls).to.be.equal(3)
		expect(childCalls).to.be.equal(3)
		expect(parent().a.b.c).to.be.equal(15)
		expect(child().c).to.be.equal(15)

		middle({b: {c: 20}})
		expect(parentCalls).to.be.equal(3)
		expect(childCalls).to.be.equal(3)
		expect(parent().a.b.c).to.be.equal(20)
		expect(child().c).to.be.equal(20)

	})

	test("chain property subboxes with middle one implicit subscrption", () => {
		const parent = box({a: {b: {c: 5}}})
		const middle = parent.prop("a")
		const child = middle.prop("b")
		let parentCalls = 0
		const parentUnsub = parent.subscribe(() => parentCalls++)
		let childCalls = 0
		const childUnsub = child.subscribe(() => childCalls++)

		expect(parentCalls).to.be.equal(0)
		expect(childCalls).to.be.equal(0)
		expect(parent().a.b.c).to.be.equal(5)
		expect(child().c).to.be.equal(5)

		child({c: 10})
		expect(parentCalls).to.be.equal(1)
		expect(childCalls).to.be.equal(1)
		expect(parent().a.b.c).to.be.equal(10)
		expect(child().c).to.be.equal(10)

		parent({a: {b: {c: 15}}})
		expect(parentCalls).to.be.equal(2)
		expect(childCalls).to.be.equal(2)
		expect(parent().a.b.c).to.be.equal(15)
		expect(child().c).to.be.equal(15)

		middle({b: {c: 20}})
		expect(parentCalls).to.be.equal(3)
		expect(childCalls).to.be.equal(3)
		expect(parent().a.b.c).to.be.equal(20)
		expect(child().c).to.be.equal(20)

		parentUnsub()
		childUnsub()

		child({c: 10})
		expect(parentCalls).to.be.equal(3)
		expect(childCalls).to.be.equal(3)
		expect(parent().a.b.c).to.be.equal(10)
		expect(child().c).to.be.equal(10)

		parent({a: {b: {c: 15}}})
		expect(parentCalls).to.be.equal(3)
		expect(childCalls).to.be.equal(3)
		expect(parent().a.b.c).to.be.equal(15)
		expect(child().c).to.be.equal(15)

		middle({b: {c: 20}})
		expect(parentCalls).to.be.equal(3)
		expect(childCalls).to.be.equal(3)
		expect(parent().a.b.c).to.be.equal(20)
		expect(child().c).to.be.equal(20)
	})

	test("chain property subboxes with only top sub", () => {
		const parent = box({a: {b: {c: 5}}})
		const middle = parent.prop("a")
		const child = middle.prop("b")
		let parentCalls = 0
		const unsub = parent.subscribe(() => parentCalls++)

		expect(parentCalls).to.be.equal(0)
		expect(parent().a.b.c).to.be.equal(5)
		expect(child().c).to.be.equal(5)

		child({c: 10})
		expect(parentCalls).to.be.equal(1)
		expect(parent().a.b.c).to.be.equal(10)
		expect(child().c).to.be.equal(10)

		parent({a: {b: {c: 15}}})
		expect(parentCalls).to.be.equal(2)
		expect(parent().a.b.c).to.be.equal(15)
		expect(child().c).to.be.equal(15)

		middle({b: {c: 20}})
		expect(parentCalls).to.be.equal(3)
		expect(parent().a.b.c).to.be.equal(20)
		expect(child().c).to.be.equal(20)

		unsub()

		child({c: 10})
		expect(parentCalls).to.be.equal(3)
		expect(parent().a.b.c).to.be.equal(10)
		expect(child().c).to.be.equal(10)

		parent({a: {b: {c: 15}}})
		expect(parentCalls).to.be.equal(3)
		expect(parent().a.b.c).to.be.equal(15)
		expect(child().c).to.be.equal(15)

		middle({b: {c: 20}})
		expect(parentCalls).to.be.equal(3)
		expect(parent().a.b.c).to.be.equal(20)
		expect(child().c).to.be.equal(20)
	})

	test("chain property subboxes with only bottom sub", () => {
		const parent = box({a: {b: {c: 5}}})
		const middle = parent.prop("a")
		const child = middle.prop("b")
		let childCalls = 0
		const unsub = child.subscribe(() => childCalls++)

		expect(childCalls).to.be.equal(0)
		expect(parent().a.b.c).to.be.equal(5)
		expect(child().c).to.be.equal(5)

		child({c: 10})
		expect(childCalls).to.be.equal(1)
		expect(parent().a.b.c).to.be.equal(10)
		expect(child().c).to.be.equal(10)

		parent({a: {b: {c: 15}}})
		expect(childCalls).to.be.equal(2)
		expect(parent().a.b.c).to.be.equal(15)
		expect(child().c).to.be.equal(15)

		middle({b: {c: 20}})
		expect(childCalls).to.be.equal(3)
		expect(parent().a.b.c).to.be.equal(20)
		expect(child().c).to.be.equal(20)

		unsub()

		child({c: 10})
		expect(childCalls).to.be.equal(3)
		expect(parent().a.b.c).to.be.equal(10)
		expect(child().c).to.be.equal(10)

		parent({a: {b: {c: 15}}})
		expect(childCalls).to.be.equal(3)
		expect(parent().a.b.c).to.be.equal(15)
		expect(child().c).to.be.equal(15)

		middle({b: {c: 20}})
		expect(childCalls).to.be.equal(3)
		expect(parent().a.b.c).to.be.equal(20)
		expect(child().c).to.be.equal(20)
	})

	test("views calculations when noone is subscribed", () => {
		const b = box(5)
		let calcCount = 0
		const view = viewBox(() => {
			calcCount++
			return b() * 2
		})

		expect(calcCount).to.be.equal(0)
		expect(view()).to.be.equal(10)
		expect(calcCount).to.be.equal(1)
		expect(view()).to.be.equal(10)
		expect(calcCount).to.be.equal(2)

		b(6)
		expect(calcCount).to.be.equal(2)
		expect(view()).to.be.equal(12)
		expect(calcCount).to.be.equal(3)
		expect(view()).to.be.equal(12)
		expect(calcCount).to.be.equal(4)
	})

	test("view only subscribes to param box, not to the parent box", () => {
		const parent = box({a: 5})
		const child = parent.prop("a")
		let parentNotifications = 0
		parent.subscribe(() => parentNotifications++)
		let childNotifications = 0
		child.subscribe(() => childNotifications++)
		let calcCount = 0
		const view = viewBox(() => {
			calcCount++
			return child() * 2
		})
		view.subscribe(() => {
			// nothing
		})

		expect(calcCount).to.be.equal(1)
		expect(parentNotifications).to.be.equal(0)
		expect(childNotifications).to.be.equal(0)

		parent({a: 6})
		expect(calcCount).to.be.equal(2)
		expect(parentNotifications).to.be.equal(1)
		expect(childNotifications).to.be.equal(1)

		parent({a: 6})
		expect(calcCount).to.be.equal(2)
		expect(parentNotifications).to.be.equal(2)
		expect(childNotifications).to.be.equal(1)
	})

	test("view works fine with zero dependencies", () => {
		let calcCount = 0
		const view = viewBox(() => {
			calcCount++
			return 2 * 2
		})

		expect(view()).to.be.equal(4)
		expect(calcCount).to.be.equal(1)
		expect(view()).to.be.equal(4)
		expect(calcCount).to.be.equal(2)

		let subCalls = 0
		view.subscribe(() => {
			subCalls++
		})

		expect(subCalls).to.be.equal(0)
		expect(view()).to.be.equal(4)
		expect(subCalls).to.be.equal(0)
	})

	test("explicit dependency list in views", () => {
		const a = box(2)
		const b = box(2)
		const c = viewBox(() => a() + b(), [a])

		expect(c()).to.be.equal(4)
		a(3)
		expect(c()).to.be.equal(5)
		b(3)
		expect(c()).to.be.equal(5) // no resubscription - wrong value; that's why you don't do that
		a(4)
		expect(c()).to.be.equal(7)

		let callsCount = 0
		c.subscribe(() => callsCount++)
		expect(callsCount).to.be.equal(0)
		a(5)
		expect(callsCount).to.be.equal(1)
		expect(c()).to.be.equal(8)
		b(4)
		expect(callsCount).to.be.equal(1)
		expect(c()).to.be.equal(8)
		a(6)
		expect(callsCount).to.be.equal(2)
		expect(c()).to.be.equal(10)
	})

	test("map method", () => {
		const a = box(2)
		const b = box(2)
		const c = a.map(num => num + b())

		expect(isRBox(c)).to.be(true)
		expect(isWBox(c)).to.be(false)
		expect(isRBox(c())).to.be(false)
		expect(isWBox(c())).to.be(false)
		expect(unbox(c)).to.be(4)

		expect(c()).to.be.equal(4)
		a(3)
		expect(c()).to.be.equal(5)
		b(3)
		expect(c()).to.be.equal(5) // used unlisted box in mapper - wrong value
		a(4)
		expect(c()).to.be.equal(7)

		let callsCount = 0
		c.subscribe(() => callsCount++)
		expect(callsCount).to.be.equal(0)
		a(5)
		expect(callsCount).to.be.equal(1)
		expect(c()).to.be.equal(8)
		b(4)
		expect(callsCount).to.be.equal(1)
		expect(c()).to.be.equal(8)
		a(6)
		expect(callsCount).to.be.equal(2)
		expect(c()).to.be.equal(10)
	})

	test("two same-field prop boxes", () => {
		const p = box({a: 5})
		const a = p.prop("a")
		const b = p.prop("a")

		expect(a()).to.be.equal(5)
		expect(b()).to.be.equal(5)

		a(6)
		expect(a()).to.be.equal(6)
		expect(b()).to.be.equal(6)
		expect(p().a).to.be.equal(6)

		b(7)
		expect(a()).to.be.equal(7)
		expect(b()).to.be.equal(7)
		expect(p().a).to.be.equal(7)

		let callCount = 0
		let lastBValue = b()
		const unsub = b.subscribe(v => {
			lastBValue = v
			callCount++
		})
		expect(callCount).to.be.equal(0)
		expect(lastBValue).to.be.equal(7)
		a(8)
		expect(a()).to.be.equal(8)
		expect(b()).to.be.equal(8)
		expect(callCount).to.be.equal(1)
		expect(lastBValue).to.be.equal(8)
		b(9)
		expect(a()).to.be.equal(9)
		expect(b()).to.be.equal(9)
		expect(callCount).to.be.equal(2)
		expect(lastBValue).to.be.equal(9)
		p({a: 10})
		expect(a()).to.be.equal(10)
		expect(b()).to.be.equal(10)
		expect(callCount).to.be.equal(3)
		expect(lastBValue).to.be.equal(10)

		unsub()
		expect(callCount).to.be.equal(3)
		expect(lastBValue).to.be.equal(10)
		a(11)
		expect(callCount).to.be.equal(3)
		expect(lastBValue).to.be.equal(10)
		expect(a()).to.be.equal(11)
		expect(b()).to.be.equal(11)
		expect(p().a).to.be.equal(11)
	})

	test("prop of viewbox", () => {
		const parent = box({a: 5}) as WBoxInternal<{a: number}>
		const view = viewBox(() => ({...parent(), b: parent().a * 2})) as RBoxInternal<{a: number, b: number}>
		const propA1 = view.prop("a") as RBoxInternal<number>
		const propA2 = view.prop("a") as RBoxInternal<number>
		const propB = view.prop("b") as RBoxInternal<number>

		expect(propA1()).to.be.equal(5)
		expect(propA2()).to.be.equal(5)
		expect(propB()).to.be.equal(10)
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(view.haveSubscribers()).to.be.equal(false)
		expect(propA1.haveSubscribers()).to.be.equal(false)
		expect(propA2.haveSubscribers()).to.be.equal(false)
		expect(propB.haveSubscribers()).to.be.equal(false)

		parent({a: 6})

		expect(propA1()).to.be.equal(6)
		expect(propA2()).to.be.equal(6)
		expect(propB()).to.be.equal(12)
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(view.haveSubscribers()).to.be.equal(false)
		expect(propA1.haveSubscribers()).to.be.equal(false)
		expect(propA2.haveSubscribers()).to.be.equal(false)
		expect(propB.haveSubscribers()).to.be.equal(false)

		let notifyCount = 0
		const unsub = propA1.subscribe(() => notifyCount++)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(view.haveSubscribers()).to.be.equal(true)
		expect(propA1.haveSubscribers()).to.be.equal(true)
		expect(propA2.haveSubscribers()).to.be.equal(false)
		expect(propB.haveSubscribers()).to.be.equal(false)

		parent({a: 7})
		expect(propA1()).to.be.equal(7)
		expect(notifyCount).to.be.equal(1)

		parent({a: 8})
		expect(propA1()).to.be.equal(8)
		expect(notifyCount).to.be.equal(2)

		unsub()
		parent({a: 9})
		expect(propA1()).to.be.equal(9)
		expect(notifyCount).to.be.equal(2)
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(view.haveSubscribers()).to.be.equal(false)
		expect(propA1.haveSubscribers()).to.be.equal(false)
		expect(propA2.haveSubscribers()).to.be.equal(false)
		expect(propB.haveSubscribers()).to.be.equal(false)
	})

	test("viewboxes are unsubscribing properly", () => {
		const b = box(5)
		const v = viewBox(() => b() * 2)

		const rb = b as unknown as RBoxInternal<number>
		const rv = v as RBoxInternal<number>

		expect(rb.haveSubscribers()).to.be.equal(false)
		expect(rv.haveSubscribers()).to.be.equal(false)
		expect(v()).to.be.equal(10)
		expect(rb.haveSubscribers()).to.be.equal(false)
		expect(rv.haveSubscribers()).to.be.equal(false)

		let notifyCount = 0
		const unsub = v.subscribe(() => notifyCount++)
		expect(notifyCount).to.be.equal(0)
		expect(rb.haveSubscribers()).to.be.equal(true)
		expect(rv.haveSubscribers()).to.be.equal(true)
		expect(v()).to.be.equal(10)

		b(6)
		expect(notifyCount).to.be.equal(1)
		expect(rb.haveSubscribers()).to.be.equal(true)
		expect(rv.haveSubscribers()).to.be.equal(true)
		expect(v()).to.be.equal(12)

		unsub()
		expect(notifyCount).to.be.equal(1)
		expect(rb.haveSubscribers()).to.be.equal(false)
		expect(rv.haveSubscribers()).to.be.equal(false)
	})

	test("chain viewboxes are unsubscribing properly", () => {
		const b = box(5)
		const v = viewBox(() => b() * 2)
		const vv = viewBox(() => v() - 2)

		const rb = b as unknown as RBoxInternal<number>
		const rv = v as RBoxInternal<number>
		const rvv = vv as RBoxInternal<number>

		expect(rb.haveSubscribers()).to.be.equal(false)
		expect(rv.haveSubscribers()).to.be.equal(false)
		expect(rvv.haveSubscribers()).to.be.equal(false)
		expect(vv()).to.be.equal(8)
		expect(rb.haveSubscribers()).to.be.equal(false)
		expect(rv.haveSubscribers()).to.be.equal(false)
		expect(rvv.haveSubscribers()).to.be.equal(false)

		let notifyCount = 0
		const unsub = vv.subscribe(() => notifyCount++)
		expect(notifyCount).to.be.equal(0)
		expect(rb.haveSubscribers()).to.be.equal(true)
		expect(rv.haveSubscribers()).to.be.equal(true)
		expect(rvv.haveSubscribers()).to.be.equal(true)
		expect(vv()).to.be.equal(8)

		b(6)
		expect(notifyCount).to.be.equal(1)
		expect(rb.haveSubscribers()).to.be.equal(true)
		expect(rv.haveSubscribers()).to.be.equal(true)
		expect(rvv.haveSubscribers()).to.be.equal(true)
		expect(vv()).to.be.equal(10)

		unsub()
		expect(notifyCount).to.be.equal(1)
		expect(rb.haveSubscribers()).to.be.equal(false)
		expect(rv.haveSubscribers()).to.be.equal(false)
		expect(rvv.haveSubscribers()).to.be.equal(false)
	})

	test("propboxes are unsubscribing properly", () => {
		const parent = box({a: 5}) as WBoxInternal<{a: number}>
		const child = parent.prop("a") as WBoxInternal<number>

		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(child.haveSubscribers()).to.be.equal(false)

		parent({a: 6})
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(child.haveSubscribers()).to.be.equal(false)
		expect(child()).to.be.equal(6)
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(child.haveSubscribers()).to.be.equal(false)

		child(7)
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(child.haveSubscribers()).to.be.equal(false)
		expect(parent().a).to.be.equal(7)
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(child.haveSubscribers()).to.be.equal(false)

		let parentNotifyCount = 0
		const unsubParent = parent.subscribe(() => parentNotifyCount++)
		expect(parentNotifyCount).to.be.equal(0)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(child.haveSubscribers()).to.be.equal(false)
		expect(child()).to.be.equal(7)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(child.haveSubscribers()).to.be.equal(false)

		parent({a: 8})
		expect(parentNotifyCount).to.be.equal(1)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(child.haveSubscribers()).to.be.equal(false)
		expect(child()).to.be.equal(8)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(child.haveSubscribers()).to.be.equal(false)

		let childNotifyCount = 0
		const unsubChild = child.subscribe(() => childNotifyCount++)
		expect(parentNotifyCount).to.be.equal(1)
		expect(childNotifyCount).to.be.equal(0)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(child.haveSubscribers()).to.be.equal(true)

		child(9)
		expect(parentNotifyCount).to.be.equal(2)
		expect(childNotifyCount).to.be.equal(1)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(child.haveSubscribers()).to.be.equal(true)
		expect(child()).to.be.equal(9)
		expect(parent().a).to.be.equal(9)

		unsubParent()
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(child.haveSubscribers()).to.be.equal(true)

		unsubChild()
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(child.haveSubscribers()).to.be.equal(false)
	})

	test("chain propboxes are unsubscribing properly", () => {
		const parent = box({a: {b: 5}}) as WBoxInternal<{a: {b: number}}>
		const middle = parent.prop("a") as WBoxInternal<{b: number}>
		const child = middle.prop("b") as WBoxInternal<number>

		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(child.haveSubscribers()).to.be.equal(false)

		parent({a: {b: 6}})
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(child.haveSubscribers()).to.be.equal(false)
		expect(child()).to.be.equal(6)
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(child.haveSubscribers()).to.be.equal(false)

		child(7)
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(child.haveSubscribers()).to.be.equal(false)
		expect(parent().a.b).to.be.equal(7)
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(child.haveSubscribers()).to.be.equal(false)

		let parentNotifyCount = 0
		const unsubParent = parent.subscribe(() => parentNotifyCount++)
		expect(parentNotifyCount).to.be.equal(0)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(child.haveSubscribers()).to.be.equal(false)
		expect(child()).to.be.equal(7)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(child.haveSubscribers()).to.be.equal(false)

		parent({a: {b: 8}})
		expect(parentNotifyCount).to.be.equal(1)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(child.haveSubscribers()).to.be.equal(false)
		expect(child()).to.be.equal(8)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(child.haveSubscribers()).to.be.equal(false)

		let childNotifyCount = 0
		const unsubChild = child.subscribe(() => childNotifyCount++)
		expect(parentNotifyCount).to.be.equal(1)
		expect(childNotifyCount).to.be.equal(0)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(child.haveSubscribers()).to.be.equal(true)

		child(9)
		expect(parentNotifyCount).to.be.equal(2)
		expect(childNotifyCount).to.be.equal(1)
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(child.haveSubscribers()).to.be.equal(true)
		expect(child()).to.be.equal(9)
		expect(parent().a.b).to.be.equal(9)

		unsubParent()
		expect(parent.haveSubscribers()).to.be.equal(true)
		expect(child.haveSubscribers()).to.be.equal(true)

		unsubChild()
		expect(parent.haveSubscribers()).to.be.equal(false)
		expect(child.haveSubscribers()).to.be.equal(false)
	})

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

	test("wbox mapping basic", () => {
		const b = box(1)
		const bb = b.map(x => x * 2, x => x / 2)

		expect(b()).to.be(1)
		expect(bb()).to.be(2)

		b(2)
		expect(b()).to.be(2)
		expect(bb()).to.be(4)

		bb(12)
		expect(b()).to.be(6)
		expect(bb()).to.be(12)
	})

	test("wbox mapping basic sub", () => {
		const b = box(1) as WBoxInternal<number>
		const bb = b.map(x => x * 2, x => x / 2)

		expect(b.haveSubscribers()).to.be(false)
		let v: number | null = null
		const unsub = bb.subscribe(x => v = x)

		expect(b.haveSubscribers()).to.be(true)
		expect(b()).to.be(1)
		expect(bb()).to.be(2)
		expect(v).to.be(null)

		b(2)
		expect(b()).to.be(2)
		expect(bb()).to.be(4)
		expect(v).to.be(4)

		bb(12)
		expect(b()).to.be(6)
		expect(bb()).to.be(12)
		expect(v).to.be(12)

		unsub()
		expect(b.haveSubscribers()).to.be(false)
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

	test("const box", () => {
		const b = constBox(5)
		expect(isRBox(b)).to.be(true)
		expect(isWBox(b)).to.be(false)
		expect(isConstBox(b)).to.be(true)
		expect(b()).to.be(5)
		const unsub = b.subscribe(v => console.log(v))
		expect(typeof(unsub)).to.be("function")
		unsub()

		const bb = constBoxWrap(viewBox(() => 12345))
		expect(isRBox(bb)).to.be(true)
		expect(isWBox(bb)).to.be(false)
		expect(isConstBox(bb)).to.be(false)
		expect(bb()).to.be(12345)
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

	test("wbox is rbox in types", () => {
		const wbox = box("uwu")
		const someBox: Boxed<WBox<string>> = constBoxWrap(wbox)
		const someSomeBox: WBox<string> = constBoxWrap(wbox)
		expect(someSomeBox()).to.be("uwu")
		expect(someBox()).to.be("uwu")
		expect({someBoxIsRBox: someBox.isRBox}).to.eql({someBoxIsRBox: true})
		expect({isRboxSomeBox: isRBox(someBox)}).to.eql({isRboxSomeBox: true})
		expect({isWBoxSomeBox: isWBox(someBox)}).to.eql({isWBoxSomeBox: true})
		expect(someSomeBox).to.be(someBox)
		expect(someBox).to.be(wbox)
		const otherBoxToTypecheck: Boxed<WBox<string>> = wbox
		expect(otherBoxToTypecheck()).to.be("uwu")
	})

	test("box with explicit dependency list caches result always", () => {
		const a = box(5)
		let callCount = 0
		const b = a.map(x => {
			callCount++
			return x + 10
		})

		expect(callCount).to.be(0)
		expect(b()).to.be(15)
		expect(callCount).to.be(1)
		expect(b()).to.be(15)
		expect(callCount).to.be(1)

		a(10)
		expect(callCount).to.be(1) // no subscription; `b` shouldn't know that `a` changed
		expect(b()).to.be(20)
		expect(callCount).to.be(2)
		expect(b()).to.be(20)
		expect(callCount).to.be(2)
	})

	test("two-way mapper only invokes actual mapper if source value changed", () => {
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

		expect(b()).to.be(10)
		expect({directCalls}).to.eql({directCalls: 1})
		expect({reverseCalls}).to.eql({reverseCalls: 0})

		expect(b()).to.be(10)
		expect({directCalls}).to.eql({directCalls: 1})
		expect({reverseCalls}).to.eql({reverseCalls: 0})

		b(30)
		expect(a()).to.be(15)
		expect({directCalls}).to.eql({directCalls: 1})
		expect({reverseCalls}).to.eql({reverseCalls: 1})

		b(30)
		expect(a()).to.be(15)
		expect({directCalls}).to.eql({directCalls: 1})
		expect({reverseCalls}).to.eql({reverseCalls: 1})
	})

	test("const box wrap produces correct types", () => {
		const mrboxA: MRBox<number> = 5
		const cboxA = constBoxWrap(mrboxA)
		expect(cboxA()).to.be(5)
		const checkA: CheckEquals<typeof cboxA, RBox<number>> = true
		expect(checkA).to.be(true)

		const mrboxB: MRBox<string> = box("uwu")
		const cboxB = constBoxWrap(mrboxB)
		expect(cboxB).to.be(mrboxB)
		expect(cboxB()).to.be("uwu")
		const checkB: CheckEquals<typeof cboxB, RBox<string>> = true
		expect(checkB).to.be(true)

		const props: {
			options: MRBox<readonly {readonly label: string, readonly value: string}[]>
		} = {options: box([])}

		const cboxC = constBoxWrap(props.options)
		expect(cboxC).to.be(props.options)
		const checkC: CheckEquals<typeof cboxC, RBox<readonly {readonly label: string, readonly value: string}[]>> = true
		expect(checkC).to.be(true)
	})

	test("maparray box should throw if its value is requested while the value is being recalculated", () => {
		const urls = viewBox(() => ["1", "2", "3"])
		let maxImageHeight = 0
		const calcMaxHeight = () => {
			const imgs = images()
			console.log(imgs)
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

	test("mapped box will recalculate value after unsub and resub", () => {
		const noop = () => { /* nothing */}

		const srcArray = box([1, 2, 3])
		const firstMappedArray = srcArray.map(srcArray => srcArray.map(x => x * 2))
		const secondMappedArray = firstMappedArray.map(srcArray => srcArray.map(x => x + 1))
		let unsub = secondMappedArray.subscribe(noop)
		expect(secondMappedArray()).to.eql([3, 5, 7])
		unsub()
		unsub = secondMappedArray.subscribe(noop)
		expect(secondMappedArray()).to.eql([3, 5, 7])
	})

	test("two-way mapped box receives updates when upstream is returned back to starting value", () => {
		const px = box("3px")

		let first = 0
		let second = 0

		px.subscribe(() => first++)
		px.subscribe(() => second++)
		const abs = px.map(str => parseInt(str), num => num + "px")
		let lastKnownValue = -1
		abs.subscribe(newValue => lastKnownValue = newValue)
		abs(4)
		expect(px()).to.be("4px")
		expect(first).to.be(1)
		expect(second).to.be(1)
		expect(lastKnownValue).to.be(4)
		px("3px")
		expect(first).to.be(2)
		expect(second).to.be(2)
		expect(lastKnownValue).to.be(3)
	})

})