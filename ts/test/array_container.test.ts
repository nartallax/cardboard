import {describe, test} from "@nartallax/clamsensor"
import {box, viewBox} from "src/internal"
import expect from "expect.js"
import {expectExecutionTimeLessThan, makeCallCounter} from "test/test_utils"

describe("Array container", () => {
	test("map array", () => {
		const arrBox = box([
			{id: 1, name: "1"},
			{id: 2, name: "2"},
			{id: 3, name: "3"}
		])

		let callCount = 0
		const mapResult = arrBox.mapArray(x => {
			callCount++
			return JSON.stringify(x)
		}, x => JSON.parse(x))
		expect(callCount).to.be(0)
		expect(mapResult.get()[0]!).to.be("{\"id\":1,\"name\":\"1\"}")
		mapResult.set(["{\"id\":1,\"name\":\"uwu\"}", mapResult.get()[1]!, mapResult.get()[2]!])
		expect(arrBox.get()[0]).to.eql({id: 1, name: "uwu"})
		expect(callCount).to.be(3)

		arrBox.set([arrBox.get()[1]!, arrBox.get()[2]!, arrBox.get()[0]!])
		expect(arrBox.get()[0]).to.eql({id: 2, name: "2"})
		expect(mapResult.get()[2]!).to.be("{\"id\":1,\"name\":\"uwu\"}")
		expect(callCount).to.be(3)

		arrBox.set([arrBox.get()[0]!, arrBox.get()[1]!, {...arrBox.get()[2]!, name: "owo"}])
		expect(mapResult.get()[2]!).to.be("{\"id\":1,\"name\":\"owo\"}")
		expect(callCount).to.be(4)
	})

	test("readonly array", () => {
		const roArr: readonly {id: number, name: string}[] = [
			{id: 1, name: "1"},
			{id: 2, name: "2"},
			{id: 3, name: "3"}
		]
		const arrBox = box(roArr)

		const mapResult = arrBox.mapArray(x => JSON.stringify(x), x => JSON.parse(x))
		expect(mapResult.get()[0]!).to.be("{\"id\":1,\"name\":\"1\"}")
		mapResult.set(["{\"id\":1,\"name\":\"uwu\"}", mapResult.get()[1]!, mapResult.get()[2]!])
		expect(arrBox.get()[0]).to.eql({id: 1, name: "uwu"})
	})

	test("maparray box should throw if its value is requested while the value is being recalculated", () => {
		try {
			const urls = viewBox(() => ["1", "2", "3"])
			let maxImageHeight = 0
			const calcMaxHeight = () => {
				const imgs = images.get()
				maxImageHeight = imgs.reduce((a, b) => Math.max(a, b.height), 0)
			}
			const images = urls.mapArray(
				url => {
					const img = {width: parseInt(url), height: parseInt(url)}
					calcMaxHeight()
					return img
				}
			)
			void maxImageHeight
		} catch(e){
			// cannot access images before initialization
			// this test is about synchronous call of callback mapArray
			expect(e + "").to.match(/images/)
		}
	})

	test("two boxes of the same item", () => {
		const arrBox = box([{id: 1, name: "one"}])
		const context = arrBox.getArrayContext(x => x.id)
		const firstBox = context.getBoxForKey(1)
		const secondBox = context.getBoxForKey(1)

		firstBox.set({id: 1, name: "two"})
		expect(secondBox.get().name).to.be("two")

		secondBox.set({id: 1, name: "three"})
		expect(firstBox.get().name).to.be("three")

		const counter = makeCallCounter()
		secondBox.subscribe(counter)
		firstBox.set({id: 1, name: "four"})
		expect(counter.callCount).to.be(1)
		expect(counter.lastCallValue).to.eql({id: 1, name: "four"})
	})

	test("two boxes of the same item from different contexts", () => {
		const arrBox = box([{id: 1, name: "one"}])
		const firstContext = arrBox.getArrayContext(x => x.id)
		const firstBox = firstContext.getBoxForKey(1)
		const secondContext = arrBox.getArrayContext(x => x.id)
		const secondBox = secondContext.getBoxForKey(1)

		firstBox.set({id: 1, name: "two"})
		expect(secondBox.get().name).to.be("two")

		secondBox.set({id: 1, name: "three"})
		expect(firstBox.get().name).to.be("three")

		const counter = makeCallCounter()
		secondBox.subscribe(counter)
		firstBox.set({id: 1, name: "four"})
		expect(counter.callCount).to.be(1)
		expect(counter.lastCallValue).to.eql({id: 1, name: "four"})
	})

	test("changing array item id throws", () => {
		const arrBox = box([{id: 1, name: "one"}])
		const context = arrBox.getArrayContext(x => x.id)
		const item = context.getBoxForKey(1)

		expect(() => item.set({id: 2, name: "two"})).to.throwError(/changed key/)
	})

	test("performance: array item update, one context", () => {
		const size = 1000
		const repeats = 10
		const arrBox = box(new Array(size).fill(null).map((_, i) => i))
		const context = arrBox.getArrayContext((_, i) => i)
		context.getBoxForKey(0).subscribe(() => {/* noop */})
		expectExecutionTimeLessThan(20, 100, () => {
			for(let rep = 0; rep < repeats; rep++){
				for(let i = 0; i < size; i++){
					const box = context.getBoxForKey(i)
					box.set(box.get() * 2)
				}
			}
		})
	})

	test("performance: array item update, two contexts", () => {
		const size = 1000
		const repeats = 10
		const arrBox = box(new Array(size).fill(null).map((_, i) => i))
		const firstContext = arrBox.getArrayContext((_, i) => i)
		const secondContext = arrBox.getArrayContext((_, i) => i)
		firstContext.getBoxForKey(0).subscribe(() => {/* noop */})
		secondContext.getBoxForKey(0).subscribe(() => {/* noop */})
		expectExecutionTimeLessThan(30, 100, () => {
			for(let rep = 0; rep < repeats; rep++){
				for(let i = 0; i < size; i++){
					const cont = i & 1 ? firstContext : secondContext
					const box = cont.getBoxForKey(i)
					box.set(box.get() * 2)
				}
			}
		})
	})

	test("notifications are not dropped on same-context update while previous update is in progress", () => {
		const arrayBox = box(["a", "aa"])
		const firstContext = arrayBox.getArrayContext(x => x.length)
		const secondContext = arrayBox.getArrayContext(x => x.length)
		const thirdContext = arrayBox.getArrayContext(x => x.length)
		const firstItemBox = firstContext.getBoxForKey(1)
		const secondItemBox = secondContext.getBoxForKey(1)
		const thirdItemBox = thirdContext.getBoxForKey(1)
		const thirdItemBoxB = thirdContext.getBoxForKey(2)

		const firstCounter = makeCallCounter("first")
		firstItemBox.subscribe(firstCounter)

		const secondCounter = makeCallCounter("second")
		secondItemBox.subscribe(secondCounter)

		const thirdCounter = makeCallCounter("third")
		thirdItemBox.subscribe(thirdCounter)

		// on box update new partial update will be created
		// and existing in-progress update may be lost, i.e. not delivered to one of those boxes
		// or notification can be dropped because newer update is started;
		// that means third subscriber won't get his value at all, because third arraycontext issued new update
		secondItemBox.subscribe(() => thirdItemBoxB.set("bb"))
		thirdItemBox.subscribe(() => thirdItemBoxB.set("bb"))

		firstItemBox.set("b")

		expect(secondCounter.lastCallValue).to.be("b")
		expect(thirdCounter.lastCallValue).to.be("b")
	})

	test("setElementAtIndex method", () => {
		const parent = box([1, 2, 3])
		const context = parent.getArrayContext((_, i) => i)
		const child = context.getBoxForKey(1)

		const parentCounter = makeCallCounter()
		parent.subscribe(parentCounter)

		const childCounter = makeCallCounter()
		child.subscribe(childCounter)

		parent.setElementAtIndex(0, 5)
		expect(parentCounter.callCount).to.be(1)
		expect(parentCounter.lastCallValue).to.eql([5, 2, 3])
		expect(childCounter.callCount).to.be(0)

		parent.setElementAtIndex(1, 10)
		expect(parentCounter.callCount).to.be(2)
		expect(parentCounter.lastCallValue).to.eql([5, 10, 3])
		expect(childCounter.callCount).to.be(1)
		expect(childCounter.lastCallValue).to.be(10)
	})

	test("insertElementsAtIndex method", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}, {id: 3, name: "3"}])
		const context = parent.getArrayContext(x => x.id)
		const box1 = context.getBoxForKey(1)
		const box3 = context.getBoxForKey(3)

		parent.insertElementsAtIndex(1, [{id: 4, name: "4"}, {id: 5, name: "5"}])
		expect(box1.get().name).to.be("1")
		expect(box3.get().name).to.be("3")
		expect(parent.get()).to.eql([{id: 1, name: "1"}, {id: 4, name: "4"}, {id: 5, name: "5"}, {id: 2, name: "2"}, {id: 3, name: "3"}])

		const box5 = context.getBoxForKey(5)
		expect(box5.get().name).to.be("5")

		expect(() => parent.insertElementsAtIndex(10, [{id: 6, name: "6"}])).to.throwError(/beyond array length/)
		expect(() => parent.insertElementsAtIndex(-1, [{id: 6, name: "6"}])).to.throwError(/negative index/)

		// should be fine. array won't be changed either way, so why panic?
		// this can happen in cases of some user calculations related to index that depends on inserted array length
		parent.insertElementsAtIndex(10, [])
		parent.insertElementsAtIndex(-1, [])
	})

	test("insertElementAtIndex method", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}, {id: 3, name: "3"}])
		const context = parent.getArrayContext(x => x.id)
		const box1 = context.getBoxForKey(1)
		const box3 = context.getBoxForKey(3)

		parent.insertElementAtIndex(1, {id: 4, name: "4"})
		expect(box1.get().name).to.be("1")
		expect(box3.get().name).to.be("3")
		expect(parent.get()).to.eql([{id: 1, name: "1"}, {id: 4, name: "4"}, {id: 2, name: "2"}, {id: 3, name: "3"}])

		const box4 = context.getBoxForKey(4)
		expect(box4.get().name).to.be("4")

		expect(() => parent.insertElementAtIndex(10, {id: 6, name: "6"})).to.throwError(/beyond array length/)
		expect(() => parent.insertElementAtIndex(-1, {id: 6, name: "6"})).to.throwError(/negative index/)
	})

	test("insert shorthand methods", () => {
		const parent = box([1])

		parent.appendElement(2)
		expect(parent.get()).to.eql([1, 2])

		parent.prependElement(3)
		expect(parent.get()).to.eql([3, 1, 2])

		parent.appendElements([4, 5, 6])
		expect(parent.get()).to.eql([3, 1, 2, 4, 5, 6])

		parent.prependElements([7, 8, 9])
		expect(parent.get()).to.eql([7, 8, 9, 3, 1, 2, 4, 5, 6])
	})

	test("deleteElementsAtIndex method", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}, {id: 3, name: "3"}, {id: 4, name: "4"}])
		const context = parent.getArrayContext(x => x.id)
		const box4 = context.getBoxForKey(4)
		const box3 = context.getBoxForKey(3)

		parent.deleteElementsAtIndex(1, 0)
		expect(parent.get()).to.eql([{id: 1, name: "1"}, {id: 2, name: "2"}, {id: 3, name: "3"}, {id: 4, name: "4"}])

		parent.deleteElementsAtIndex(1, 2)
		expect(parent.get()).to.eql([{id: 1, name: "1"}, {id: 4, name: "4"}])
		expect(box4.get()).to.eql({id: 4, name: "4"})
		expect(() => box3.get()).to.throwError(/no longer attached/)

		parent.deleteElementsAtIndex(1, 2)
		expect(parent.get()).to.eql([{id: 1, name: "1"}])
		expect(() => box4.get()).to.throwError(/no longer attached/)
		expect(() => box3.get()).to.throwError(/no longer attached/)

		expect(() => parent.deleteElementsAtIndex(-1, 1)).to.throwError(/negative index/)
		expect(() => parent.deleteElementsAtIndex(5, 1)).to.throwError(/beyond array length/)
	})

	test("deleteElementAtIndex method", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}, {id: 3, name: "3"}])
		const context = parent.getArrayContext(x => x.id)
		const box1 = context.getBoxForKey(1)
		const box3 = context.getBoxForKey(3)

		parent.deleteElementAtIndex(1)
		expect(parent.get()).to.eql([{id: 1, name: "1"}, {id: 3, name: "3"}])
		expect(box1.get()).to.eql({id: 1, name: "1"})
		expect(box3.get()).to.eql({id: 3, name: "3"})

		parent.deleteElementAtIndex(0)
		expect(parent.get()).to.eql([{id: 3, name: "3"}])
		expect(box3.get()).to.eql({id: 3, name: "3"})
		expect(() => box1.get()).to.throwError(/no longer attached/)

		expect(() => parent.deleteElementAtIndex(-1)).to.throwError(/negative index/)
		expect(() => parent.deleteElementAtIndex(5)).to.throwError(/beyond array length/)
	})

	test("deleteElements method", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}, {id: 3, name: "3"}])
		const context = parent.getArrayContext(x => x.id)
		const box1 = context.getBoxForKey(1)
		const box2 = context.getBoxForKey(2)

		parent.deleteElements(box => (box.id % 2) === 0)
		expect(parent.get()).to.eql([{id: 2, name: "2"}])
		expect(box2.get()).to.eql({id: 2, name: "2"})
		expect(() => box1.get()).to.throwError(/no longer attached/)
	})

	test("deleteElement method", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}, {id: 3, name: "3"}])
		const context = parent.getArrayContext(x => x.id)
		const box1 = context.getBoxForKey(1)
		const box2 = context.getBoxForKey(2)
		const box3 = context.getBoxForKey(3)

		parent.deleteElement(box => (box.id % 2) === 0)
		expect(parent.get()).to.eql([{id: 2, name: "2"}, {id: 3, name: "3"}])
		expect(() => box1.get()).to.throwError(/no longer attached/)
		expect(box2.get()).to.eql({id: 2, name: "2"})
		expect(box3.get()).to.eql({id: 3, name: "3"})

		expect(() => parent.deleteElement(() => true)).to.throwError(/found none/)
	})

	test("deleteAllElements method", () => {
		const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}, {id: 3, name: "3"}])
		const context = parent.getArrayContext(x => x.id)
		const box1 = context.getBoxForKey(1)

		parent.deleteAllElements()
		expect(parent.get()).to.eql([])
		expect(() => box1.get()).to.throwError(/no longer attached/)
	})
})