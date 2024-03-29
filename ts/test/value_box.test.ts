import {describe, test} from "@nartallax/clamsensor"
import expect from "expect.js"
import {isWBox, unbox, box, isRBox, isConstBox} from "src/cardboard"
import {makeCallCounter} from "test/test_utils"

describe("ValueBox", () => {

	test("isRBox", () => {
		expect(isRBox(box(5))).to.be(true)
	})

	test("isWBox", () => {
		expect(isWBox(box(5))).to.be(true)
	})

	test("isConstBox", () => {
		expect(isConstBox(box(5))).to.be(false)
	})

	test("unbox", () => {
		expect(unbox(box(8))).to.be(8)
	})

	test("toString", () => {
		expect(box(8) + "").to.be("ValueBox(8)")
	})

	test("can put value inside and get it out later", () => {
		const b = box(0)
		expect(b.get()).to.be(0)
		b.set(1)
		expect(b.get()).to.be(1)
		b.set(1)
		expect(b.get()).to.be(1)
		b.set(0)
		expect(b.get()).to.be(0)
	})

	test("calls subscribers on change", () => {
		const b = box(6)
		const counter = makeCallCounter()
		b.set(7)
		expect(b.get()).to.be(7)
		expect(counter.callCount).to.be(0)

		b.subscribe(counter)
		expect(counter.callCount).to.be(0)
		b.set(8)
		expect(counter.callCount).to.be(1)
		expect(counter.lastCallValue).to.be(8)
		b.set(8)
		expect(counter.callCount).to.be(1)
		expect(counter.lastCallValue).to.be(8)
		b.set(9)
		expect(counter.callCount).to.be(2)
		expect(counter.lastCallValue).to.be(9)
		b.set(8)
		expect(counter.callCount).to.be(3)
		expect(counter.lastCallValue).to.be(8)
		b.unsubscribe(counter)
		b.set(15)
		expect(counter.callCount).to.be(3)
		expect(counter.lastCallValue).to.be(8)
	})

	test("compares value by reference when deciding if to call subscribers", () => {
		const x = {name: "x"}
		const y = {name: "y"}
		const b = box(x)
		expect(b.get()).to.be(x)

		const counter = makeCallCounter()
		b.subscribe(counter)
		b.set(x)
		expect(counter.callCount).to.be(0)
		b.set(y)
		expect(counter.callCount).to.be(1)
		expect(counter.lastCallValue).to.be(y)
		b.set(y)
		expect(counter.callCount).to.be(1)
		b.set(x)
		expect(counter.callCount).to.be(2)
		expect(counter.lastCallValue).to.be(x)
	})

	test("subscriber does not receive outdated values", () => {
		const b = box(0)
		b.subscribe(v => b.set(Math.floor(v / 2) * 2))
		const counter = makeCallCounter()
		b.subscribe(counter)

		expect(counter.callCount).to.be.equal(0)
		b.set(1)
		expect(counter.callCount).to.be.equal(0)
		b.set(2)
		expect(counter.callCount).to.be.equal(1)
		expect(counter.lastCallValue).to.be.equal(2)
		b.set(3)
		expect(counter.callCount).to.be.equal(1)
		expect(counter.lastCallValue).to.be.equal(2)
		b.set(4)
		expect(counter.callCount).to.be.equal(2)
		expect(counter.lastCallValue).to.be.equal(4)
	})

	test("subscribers are called in the order of subscription", () => {
		let str = ""
		const b = box(0)
		const middleSubscriber = () => str += "b"
		b.subscribe(() => str += "a")
		b.subscribe(middleSubscriber)
		b.subscribe(() => str += "c")
		b.set(1)
		expect(str).to.be("abc")
		b.unsubscribe(middleSubscriber)
		b.subscribe(middleSubscriber)
		str = ""
		b.set(2)
		expect(str).to.be("acb")
	})
})