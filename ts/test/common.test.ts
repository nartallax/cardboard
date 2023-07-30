import {describe, test} from "@nartallax/clamsensor"
import expect from "expect.js"
import {Boxed, MRBox, RBox, WBox, box, constBoxWrap, isConstBox, isRBox, isWBox, unbox} from "src/cardboard"
import {BoxInternal, Unboxed} from "src/types"
import {IfTypeEquals, makeCallCounter} from "test/test_utils"

describe("common functions", () => {

	// tests about result of is___box calls for particular box types
	// should be put in respective test files
	test("isRBox", () => {
		expect(isRBox(0)).to.be(false)
		expect(isRBox({})).to.be(false)
	})

	test("isWBox", () => {
		expect(isWBox(0)).to.be(false)
		expect(isWBox({})).to.be(false)
	})

	test("isConstBox", () => {
		expect(isConstBox(0)).to.be(false)
		expect(isConstBox({})).to.be(false)
	})

	test("unbox", () => {
		expect(unbox(6)).to.be(6)
	})

	test("const box wrap of box", () => {
		const b = box(54321)
		const bb: RBox<number> = constBoxWrap(b)
		expect(isRBox(bb)).to.be(true)
		expect(isWBox(bb)).to.be(true)
		expect(isConstBox(bb)).to.be(false)
		expect(bb).to.be(b)
		expect(bb.get()).to.be(54321)
	})

	test("const box wrap of non-box", () => {
		const bb: RBox<string> = constBoxWrap("ayaya")
		expect(isRBox(bb)).to.be(true)
		expect(isWBox(bb)).to.be(false)
		expect(isConstBox(bb)).to.be(true)
		expect(bb.get()).to.be("ayaya")
	})

	test("Boxed type retains writeableness", () => {
		const check: IfTypeEquals<Boxed<WBox<string>>, WBox<string>> = true
		expect(check).to.be(true)
	})

	test("Boxed type retains readonlyness", () => {
		const check: IfTypeEquals<Boxed<RBox<string>>, RBox<string>> = true
		expect(check).to.be(true)

		const check2: IfTypeEquals<Boxed<RBox<string>>, WBox<string>> = false
		expect(check2).to.be(false)

		const check3: IfTypeEquals<Boxed<string>, RBox<string>> = true
		expect(check3).to.be(true)
	})

	test("Boxed type processes MRBox properly", () => {
		const check: IfTypeEquals<Boxed<MRBox<string>>, RBox<string>> = true
		expect(check).to.be(true)

		const props: {
			options: MRBox<readonly {readonly label: string, readonly value: string}[]>
		} = {options: box([])}

		const cboxC = constBoxWrap(props.options)
		expect(cboxC).to.be(props.options)
		const checkC: IfTypeEquals<typeof cboxC, RBox<readonly {readonly label: string, readonly value: string}[]>> = true
		expect(checkC).to.be(true)
	})

	test("Boxed type processes union types properly", () => {
		const check: IfTypeEquals<Boxed<string | number>, RBox<string | number>> = true
		expect(check).to.be(true)
	})

	test("Boxed type processes MRBox union types properly", () => {
		const check: IfTypeEquals<Boxed<MRBox<string | number>>, RBox<string | number>> = true
		expect(check).to.be(true)
	})

	test("wbox is rbox in types", () => {
		const wbox = box("uwu")
		const rbox: RBox<string> = wbox
		expect(rbox).to.be(wbox)
	})

	test("Unbox type", () => {
		{
			const check: IfTypeEquals<Unboxed<string>, string > = true
			expect(check).to.be(true)
		}

		{
			const check: IfTypeEquals<Unboxed<string | number>, string | number> = true
			expect(check).to.be(true)
		}

		{
			const check: IfTypeEquals<Unboxed<RBox<string>>, string> = true
			expect(check).to.be(true)
		}

		{
			const check: IfTypeEquals<Unboxed<RBox<string> | string>, string> = true
			expect(check).to.be(true)
		}

		{
			const check: IfTypeEquals<Unboxed<RBox<string> | string | null>, string | null> = true
			expect(check).to.be(true)
		}

		{
			const check: IfTypeEquals<Unboxed<RBox<string> | string | null | undefined>, string | null | undefined> = true
			expect(check).to.be(true)
		}

		{
			const check: IfTypeEquals<Unboxed<WBox<string> | string>, string> = true
			expect(check).to.be(true)
		}
	})

	test("double subscription/unsubscription does nothing", () => {
		const b = box(5) as BoxInternal<number>
		const counter = makeCallCounter()
		expect(b.haveSubscribers()).to.be(false)

		b.subscribe(counter)
		b.subscribe(counter)
		expect(b.haveSubscribers()).to.be(true)
		expect(counter.callCount).to.be(0)

		b.set(6)
		expect(counter.callCount).to.be(1)
		expect(counter.lastCallValue).to.be(6)

		b.unsubscribe(counter)
		expect(b.haveSubscribers()).to.be(false)

		b.set(7)
		expect(counter.callCount).to.be(1)
		expect(counter.lastCallValue).to.be(6)

		b.unsubscribe(counter)
		expect(b.haveSubscribers()).to.be(false)

		b.set(8)
		expect(counter.callCount).to.be(1)
		expect(counter.lastCallValue).to.be(6)
	})
})