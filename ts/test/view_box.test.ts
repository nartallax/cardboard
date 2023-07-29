import {describe, test} from "@nartallax/clamsensor"
import expect from "expect.js"
import {box, isConstBox, isRBox, isWBox, unbox, viewBox} from "src/cardboard"
import {BoxInternal} from "src/types"
import {makeCallCounter} from "test/test_utils"

describe("ViewBox", () => {

	test("isRBox", () => {
		expect(isRBox(viewBox(() => 5))).to.be(true)
	})

	test("isWBox", () => {
		expect(isWBox(viewBox(() => 5))).to.be(false)
	})

	test("isConstBox", () => {
		expect(isConstBox(viewBox(() => 5))).to.be(false)
	})

	test("unbox", () => {
		expect(unbox(viewBox(() => 5))).to.be(5)
	})

	test("toString", () => {
		expect(viewBox(() => 5) + "").to.be("ViewBox(5)")
	})

	test("calls subscriber when dependency updates and value updates", () => {
		const a = box(0)
		const b = viewBox(() => Math.floor(a.get() / 2))

		const counter = makeCallCounter()

		b.subscribe(counter)
		expect(counter.callCount).to.be.equal(0)
		expect(b.get()).to.be.equal(0)

		a.set(1)
		expect(b.get()).to.be.equal(0)
		expect(counter.callCount).to.be.equal(0)

		a.set(2)
		expect(b.get()).to.be.equal(1)
		expect(counter.callCount).to.be.equal(1)

		b.unsubscribe(counter)
		a.set(5)
		expect(b.get()).to.be.equal(2)
		expect(counter.callCount).to.be.equal(1)
	})

	test("calculation logic when no subscribers", () => {
		const b = box(5)
		let calcCount = 0
		const view = viewBox(() => {
			calcCount++
			return b.get() * 2
		})

		expect(calcCount).to.be.equal(1)
		expect(view.get()).to.be.equal(10)
		expect(calcCount).to.be.equal(1)
		expect(view.get()).to.be.equal(10)
		expect(calcCount).to.be.equal(1)

		b.set(6)
		expect(calcCount).to.be.equal(1)
		expect(view.get()).to.be.equal(12)
		expect(calcCount).to.be.equal(2)
		expect(view.get()).to.be.equal(12)
		expect(calcCount).to.be.equal(2)
	})

	test("calls subscriber when viewBox depends on other viewBox", () => {
		const a = box(5)
		const b = viewBox(() => a.get() * 2)
		const c = viewBox(() => b.get() * 3)

		let successB = false
		let successC = false

		b.subscribe(() => successB = true)
		c.subscribe(() => successC = true)
		a.set(10)

		expect(a.get()).to.be.equal(10)
		expect(b.get()).to.be.equal(20)
		expect(c.get()).to.be.equal(60)
		expect(successB).to.be.equal(true)
		expect(successC).to.be.equal(true)
	})

	test("properly recalculates when viewBox depends on other viewBox without subscribers", () => {
		const a = box(5)
		const b = viewBox(() => a.get() * 2)
		const c = viewBox(() => b.get() * 3)

		expect(c.get()).to.be(30)

		a.set(10)
		expect(c.get()).to.be.equal(60)
	})

	test("only subscribes to direct dependencies", () => {
		const a = box(5)
		let bRecalcs = 0
		const b = viewBox(() => {
			bRecalcs++
			return Math.floor(a.get() / 2)
		})
		let cRecalcs = 0
		const c = viewBox(() => {
			cRecalcs++
			return b.get() + 1
		})

		const bCounter = makeCallCounter()
		b.subscribe(bCounter)
		const cCounter = makeCallCounter()
		c.subscribe(cCounter)
		expect(b.get()).to.be.equal(2)
		expect(c.get()).to.be.equal(3)
		expect(bRecalcs).to.be.equal(1)
		expect(cRecalcs).to.be.equal(1)

		a.set(6)
		expect(bCounter.callCount).to.be.equal(1)
		expect(cCounter.callCount).to.be.equal(1)
		expect(b.get()).to.be.equal(3)
		expect(c.get()).to.be.equal(4)
		expect(bRecalcs).to.be.equal(2)
		expect(cRecalcs).to.be.equal(2)

		a.set(7)
		expect(bCounter.callCount).to.be.equal(1)
		expect(cCounter.callCount).to.be.equal(1)
		expect(b.get()).to.be.equal(3)
		expect(c.get()).to.be.equal(4)
		// THIS what this test is all about
		// b recalculated, but c does not
		// because c is only subscribed to b, and b did not change
		expect(bRecalcs).to.be.equal(3)
		expect(cRecalcs).to.be.equal(2)
	})

	test("works fine with zero dependencies", () => {
		let calcCount = 0
		const view = viewBox(() => {
			calcCount++
			return 2 * 2
		})

		expect(view.get()).to.be.equal(4)
		expect(calcCount).to.be.equal(1)
		expect(view.get()).to.be.equal(4)
		expect(calcCount).to.be.equal(1)

		let subCalls = 0
		view.subscribe(() => subCalls++)

		expect(subCalls).to.be.equal(0)
		expect(view.get()).to.be.equal(4)
		expect(subCalls).to.be.equal(0)
	})

	test("ignores additional dependencies when explicit dependency list is passed", () => {
		const a = box(2)
		const b = box(2)
		const c = viewBox(() => a.get() + b.get(), [a])

		expect(c.get()).to.be.equal(4)
		a.set(3)
		expect(c.get()).to.be.equal(5)
		b.set(3)
		expect(c.get()).to.be.equal(5) // no resubscription = wrong value; that's why you don't do that
		a.set(4)
		expect(c.get()).to.be.equal(7)

		const counter = makeCallCounter()
		c.subscribe(counter)
		expect(counter.callCount).to.be.equal(0)
		a.set(5)
		expect(counter.callCount).to.be.equal(1)
		expect(c.get()).to.be.equal(8)
		b.set(4)
		expect(counter.callCount).to.be.equal(1)
		expect(c.get()).to.be.equal(8)
		a.set(6)
		expect(counter.callCount).to.be.equal(2)
		expect(c.get()).to.be.equal(10)
	})

	test("unsubscribing properly", () => {
		const b = box(5)
		const v = viewBox(() => b.get() * 2)

		const rb = b as BoxInternal<number>
		const rv = v as BoxInternal<number>

		expect(rb.haveSubscribers()).to.be.equal(false)
		expect(rv.haveSubscribers()).to.be.equal(false)
		expect(v.get()).to.be.equal(10)
		expect(rb.haveSubscribers()).to.be.equal(false)
		expect(rv.haveSubscribers()).to.be.equal(false)

		const counter = makeCallCounter()
		v.subscribe(counter)
		expect(counter.callCount).to.be.equal(0)
		expect(rb.haveSubscribers()).to.be.equal(true)
		expect(rv.haveSubscribers()).to.be.equal(true)
		expect(v.get()).to.be.equal(10)

		b.set(6)
		expect(counter.callCount).to.be.equal(1)
		expect(rb.haveSubscribers()).to.be.equal(true)
		expect(rv.haveSubscribers()).to.be.equal(true)
		expect(v.get()).to.be.equal(12)

		v.unsubscribe(counter)
		expect(counter.callCount).to.be.equal(1)
		expect(rb.haveSubscribers()).to.be.equal(false)
		expect(rv.haveSubscribers()).to.be.equal(false)
	})

	test("unsubscribing properly when chained", () => {
		const b = box(5)
		const v = viewBox(() => b.get() * 2)
		const vv = viewBox(() => v.get() - 2)

		const rb = b as BoxInternal<number>
		const rv = v as BoxInternal<number>
		const rvv = vv as BoxInternal<number>

		expect(rb.haveSubscribers()).to.be.equal(false)
		expect(rv.haveSubscribers()).to.be.equal(false)
		expect(rvv.haveSubscribers()).to.be.equal(false)
		expect(vv.get()).to.be.equal(8)
		expect(rb.haveSubscribers()).to.be.equal(false)
		expect(rv.haveSubscribers()).to.be.equal(false)
		expect(rvv.haveSubscribers()).to.be.equal(false)

		const counter = makeCallCounter()
		vv.subscribe(counter)
		expect(counter.callCount).to.be.equal(0)
		expect(rb.haveSubscribers()).to.be.equal(true)
		expect(rv.haveSubscribers()).to.be.equal(true)
		expect(rvv.haveSubscribers()).to.be.equal(true)
		expect(vv.get()).to.be.equal(8)

		b.set(6)
		expect(counter.callCount).to.be.equal(1)
		expect(rb.haveSubscribers()).to.be.equal(true)
		expect(rv.haveSubscribers()).to.be.equal(true)
		expect(rvv.haveSubscribers()).to.be.equal(true)
		expect(vv.get()).to.be.equal(10)

		vv.unsubscribe(counter)
		expect(counter.callCount).to.be.equal(1)
		expect(rb.haveSubscribers()).to.be.equal(false)
		expect(rv.haveSubscribers()).to.be.equal(false)
		expect(rvv.haveSubscribers()).to.be.equal(false)
	})

	test("map method", () => {
		const a = box(2)
		const b = box(2)
		const c = a.map(num => num + b.get())

		expect(c.get()).to.be.equal(4)
		a.set(3)
		expect(c.get()).to.be.equal(5)
		b.set(3)
		expect(c.get()).to.be.equal(5) // used unlisted box in mapper - wrong value
		a.set(4)
		expect(c.get()).to.be.equal(7)

		const counter = makeCallCounter()
		c.subscribe(counter)
		expect(counter.callCount).to.be.equal(0)
		a.set(5)
		expect(counter.callCount).to.be.equal(1)
		expect(c.get()).to.be.equal(8)
		b.set(4)
		expect(counter.callCount).to.be.equal(1)
		expect(c.get()).to.be.equal(8)
		a.set(6)
		expect(counter.callCount).to.be.equal(2)
		expect(c.get()).to.be.equal(10)
	})


	test("viewbox with explicit dependency list caches result always", () => {
		// this test may be a bit outdated, because all viewboxes now cache values, but anyway

		const a = box(5)
		let callCount = 0
		const b = a.map(x => {
			callCount++
			return x + 10
		})

		expect(callCount).to.be(1)
		expect(b.get()).to.be(15)
		expect(callCount).to.be(1)
		expect(b.get()).to.be(15)
		expect(callCount).to.be(1)

		a.set(10)
		expect(callCount).to.be(1) // no subscription; `b` shouldn't know that `a` changed
		expect(b.get()).to.be(20)
		expect(callCount).to.be(2)
		expect(b.get()).to.be(20)
		expect(callCount).to.be(2)
	})

	test("box that changes value during call", () => {
		expect(() => {
			const myBox = box(5)
			const myViewBox = viewBox(() => {
				const firstValue = myBox.get()
				myBox.set(6)
				const secondValue = myBox.get()
				return firstValue + secondValue
			})
			expect(myViewBox.get()).to.be(11)
		}).to.throwError(/was called more than once/)
	})

})