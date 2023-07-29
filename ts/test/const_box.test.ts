import {describe, test} from "@nartallax/clamsensor"
import expect from "expect.js"
import {constBox, isConstBox, isRBox, isWBox, unbox} from "src/cardboard"

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

	test("toString", () => {
		expect(constBox({uwu: "owo"}) + "").to.be("ConstBox({\"uwu\":\"owo\"})")
	})

	test("stores value", () => {
		const b = constBox(5)
		expect(b.get()).to.be(5)
		const fn = () => {/* noop */}
		b.subscribe(fn)
		b.unsubscribe(fn)
	})
})