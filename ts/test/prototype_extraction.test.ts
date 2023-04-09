import {describe, test} from "@nartallax/clamsensor"
import {extractCombinedPrototype} from "src/common"
import expect from "expect.js"

describe("Prototype extraction", () => {
	test("it works", () => {
		class MyBaseClass {
			getNumber(): number {
				return 5
			}
		}

		class MySubClass extends MyBaseClass {
			getString(): string {
				return (this.getNumber() * 2) + ""
			}
		}

		const proto = extractCombinedPrototype(MySubClass)
		const fn = () => "owo"
		const combined: MySubClass & typeof fn = Object.setPrototypeOf(fn, proto)
		expect(combined()).to.be("owo")
		expect(combined.getNumber()).to.be(5)
		expect(combined.getString()).to.be("10")
	})

	test("super method call", () => {

		class MyBaseClass {
			getNumber(): number {
				return 5
			}
		}

		class MySubClass extends MyBaseClass {
			getNumber(): number {
				return super.getNumber() * 3
			}
		}

		const proto = extractCombinedPrototype(MySubClass)
		const fn = () => "owo"
		const combined: MySubClass & typeof fn = Object.setPrototypeOf(fn, proto)

		expect(combined.getNumber()).to.be(15)
	})

	test("instanceof", () => {
		class MyClass {
			getNumber(): number {
				return 5
			}
		}
		const proto = extractCombinedPrototype(MyClass)
		const fn = () => "owo"
		const combined: MyClass & typeof fn = Object.setPrototypeOf(fn, proto)

		expect(combined instanceof MyClass).to.be(false) // yuuup, this isn't working. oops.
		expect(combined.constructor).to.be(MyClass)
	})

	test("prototype property isnt instance property", () => {
		class MyClass {
			num = 5
		}

		const proto = extractCombinedPrototype(MyClass)
		const a: MyClass = Object.setPrototypeOf(() => "uwu", proto)
		const b: MyClass = Object.setPrototypeOf(() => "owo", proto)
		a.num = 6
		expect(b.num).to.be(5)
	})
})