import {describe, test} from "@nartallax/clamsensor"
import expect from "expect.js"
import {box, constBox, constBoxWrap, isConstBox, isRBox, isWBox, unbox} from "src/new/cardboard"

describe("ConstBox", () => {
	test("isRBox", () => {
		expect(isRBox(constBox(5))).to.be(true)
	})

	test("isWBox", () => {
		expect(isWBox(constBox(5))).to.be(false)
	})

	test("isConstBox", () => {
		expect(isConstBox(constBox(5))).to.be(true)
	})

	test("unbox", () => {
		const obj = {uwu: "owo"}
		expect(unbox(constBox(obj))).to.be(obj)
	})

	test("stores value", () => {
		const b = constBox(5)
		expect(b.get()).to.be(5)
		const fn = () => {/* noop */}
		b.subscribe(fn)
		b.unsubscribe(fn)
	})

	test("const box wrap of box", () => {
		const b = box(54321)
		const bb = constBoxWrap(b)
		expect(isRBox(bb)).to.be(true)
		expect(isWBox(bb)).to.be(true)
		expect(isConstBox(bb)).to.be(false)
		expect(bb).to.be(b)
		expect(bb.get()).to.be(54321)
	})

	test("const box wrap of non-box", () => {
		const bb = constBoxWrap("ayaya")
		expect(isRBox(bb)).to.be(true)
		expect(isWBox(bb)).to.be(false)
		expect(isConstBox(bb)).to.be(true)
		expect(bb.get()).to.be("ayaya")
	})
})