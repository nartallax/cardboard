import {describe, test} from "@nartallax/clamsensor"
import {BoxInternal, box, viewBox, withBoxUpdatesPaused} from "src/internal"
import {makeCallCounter} from "test/test_utils"
import expect from "expect.js"

describe("Update distribution", () => {

	test("viewbox gets updates before external subscribers", () => {
		const a = box(5)
		const b1 = viewBox(() => a.get() + 1)
		const b2 = viewBox(() => a.get() + 2)

		const check = () => {
			expect(b1.get()).to.be(a.get() + 1)
			expect(b2.get()).to.be(a.get() + 2)
		}

		b1.subscribe(() => check())
		b2.subscribe(() => check())

		a.set(6)
	})

	test("mapbox gets updates before viewbox", () => {
		const a = box(5)
		const b = a.map(x => x + 1)

		const calc = () => {
			expect(b.get()).to.be(a.get() + 1)
			return b.get() + 1
		}

		const c1 = viewBox(calc)
		const c2 = viewBox(calc)

		c1.subscribe(makeCallCounter())
		b.subscribe(makeCallCounter())
		c2.subscribe(makeCallCounter())

		a.set(6)
	})

	test("propbox get updates before mapbox", () => {
		const a = box({a: 5})
		const b = a.prop("a")

		const mapper = (x: {a: number}) => {
			expect(x.a).to.be(b.get())
			return b.get() + 1
		}

		const c1 = a.map(mapper)
		const c2 = a.map(mapper)

		c1.subscribe(makeCallCounter())
		b.subscribe(makeCallCounter())
		c2.subscribe(makeCallCounter())

		a.set({a: 6})
	})

	test("array item box get updates before mapbox", () => {
		const a = box([1, 2, 3])
		const b1 = a.getArrayContext((_, i) => i).getBoxForKey(1)
		const b2 = a.getArrayContext((_, i) => i).getBoxForKey(2)
		const c = a.map(arr => {
			expect(b1.get()).to.be(a.get()[1])
			expect(b2.get()).to.be(a.get()[2])
			return arr.length
		})

		b1.subscribe(makeCallCounter())
		c.subscribe(makeCallCounter())
		b2.subscribe(makeCallCounter())

		a.set([4, 5, 6])
	})

	test("viewbox depending on viewbox and same parent box gets update in proper order", () => {
		const a = box(5)
		const c1 = viewBox(() => {
			void a.get()
			expect(b.get()).to.be(a.get() + 1)
			return b.get() + a.get()
		})
		const b = viewBox(() => a.get() + 1)
		const c2 = viewBox(() => {
			void a.get()
			expect(b.get()).to.be(a.get() + 1)
			return b.get() * a.get()
		})

		c1.subscribe(makeCallCounter())
		b.subscribe(makeCallCounter())
		c2.subscribe(makeCallCounter())

		a.set(6)
	})

	test("when unsubscribed during recalculation, subscriber should not receive any more updates", () => {
		const a = box(6)

		const aCounter = makeCallCounter()
		a.subscribe(aCounter)
		const b = a.map(x => {
			a.unsubscribe(aCounter)
			a.set(x & (~1))
			return x + 1
		})
		b.subscribe(makeCallCounter())

		a.set(5)

		expect(aCounter.callCount).to.be(0)
	})

	test("when subscribed during recalculation, subscriber should receive updates", () => {
		const a = box(6)

		const aCounter = makeCallCounter("aCounter")
		const b = a.map(x => {
			a.subscribe(aCounter)
			a.set(x & (~1))
			return x + 1
		})
		b.subscribe(makeCallCounter())

		a.set(5)

		expect(aCounter.callCount).to.be(1)
		expect(aCounter.lastCallValue).to.be(4)
	})

	test("non-delivery of updates to downstream boxes that supplied the update won't lead to delivery of outdated update", () => {
		const base = box(5) as BoxInternal<number>
		base.name = "base"

		const b1 = base.map(x => {
			a.set(x & (~1))
			return x
		}, x => {
			a.set(x & (~1))
			return x
		}) as BoxInternal<number>
		b1.name = "b1"

		const a = base.map(x => x, x => x) as BoxInternal<number>
		a.name = "a"

		const b2 = base.map(x => {
			a.set(x & (~1))
			return x
		}, x => {
			a.set(x & (~1))
			return x
		}) as BoxInternal<number>
		b2.name = "b2"

		b1.subscribe(makeCallCounter("b1"))
		a.subscribe(makeCallCounter("a"))
		b2.subscribe(makeCallCounter("b2"))

		expect(b1.get()).to.be(4)
		expect(b2.get()).to.be(4)
		expect(a.get()).to.be(4)

		base.set(11)
		expect(b1.get()).to.be(10)
		expect(b2.get()).to.be(10)
		expect(a.get()).to.be(10)
	})

	test("update pausing works", () => {
		const b = box(5)
		const counter = makeCallCounter()
		b.subscribe(counter)

		withBoxUpdatesPaused(() => {
			b.set(1)
			b.set(2)
			b.set(3)
		})

		expect(counter.callCount).to.be(1)
		expect(counter.lastCallValue).to.be(3)
	})

	test("nested update pausing works", () => {
		const b = box(5)
		const counter = makeCallCounter()
		b.subscribe(counter)

		withBoxUpdatesPaused(() => {
			b.set(1)

			withBoxUpdatesPaused(() => {
				b.set(2)
			})

			b.set(3)
		})

		expect(counter.callCount).to.be(1)
		expect(counter.lastCallValue).to.be(3)
	})

})