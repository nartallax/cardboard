import {viewBox, box, WBox, RBox} from "src/cardboard"
import {describe, test} from "@nartallax/clamsensor"
import expect from "expect.js"

type RBoxInternal<T> = RBox<T> & {haveSubscribers(): boolean}
type WBoxInternal<T> = WBox<T> & RBoxInternal<T>

describe("box", () => {

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

	test("maparray box should throw if its value is requested while the value is being recalculated", () => {
		const urls = viewBox(() => ["1", "2", "3"])
		let maxImageHeight = 0
		const calcMaxHeight = () => {
			const imgs = images()
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

})