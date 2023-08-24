# Cardboard

Data logistics TS library, for those who are nostalgic of Knockout's observables.  
It allows you to organize data flow in your project. Intended to use in frontend applications, but not bound to any runtime.  

## Install

```bash
npm install @nartallax/cardboard
```

## General idea

This library allows you to put data in boxes.  
Box is a container for data that manages it; box allows you to change the data and subscribe to changes.  
You can take parts of data in box to be put into smaller box, which will synchronize their values with original box.  
You also can combine boxes, or create mapping boxes, or apply other different transforms to boxes (which result in creating new boxes that synchronize its value with original box).  

All of this can be used to organize data flow through application; typical scenario is that on some high-level control you have box with some complex objects, you split it by fields and pass through some layers of controls, to finally be bound to input, or some visual property.  

## Basic WBox usage

For example, suppose you have an input, and you need to organize bi-directional data flow; that is, you need to put initial value in input, then, as user changes value of the input, you need to notify the rest of your application that value is changed.  

To achieve that you create a `WBox`. `WBox` is a writable box; it's a container that holds a value and allows you to subscribe to changes in that value. To create a simple `WBox` that holds a value you can use a `box` function:  

```typescript
import {box, WBox} from "@nartallax/cardboard"

let inputValue = box("initial value")
```

Then you define your input to expect a mutable box:

```typescript
type MyInputProps = {
	value: WBox<string>
}

let myInput = (props: MyInputProps) => {
	// for sake of simplicity we will omit all the implementation details around DOM manipulation

	// to get value of the box we can use .get() method:
	let currentValue = props.value.get()

	setTimeout(() => {
		// here we emulate user input.
		// in real world it will be an event handler, but this is simplified example
		// when we want to update value of the box - we call .set() method on it:
		props.value.set(currentValue + " is changed")
	}, 1000)

	// here we subscribe to changes in the value,
	// because we want to update value of our input each time its value is changed
	props.value.subscribe(newValue => {
		// in real life you probably want to set input's value or something like that
		console.log("The value is updated! Now it is " + newValue)
	})
	
	// note that you need to call .unsubscribe() when input is destroyed
	// if you don't - input will live as long as the box lives, which is a memory leak
	// how exactly would you do this - is up to you and is not covered by this library
}
```

And then you can use your input with `WBox` you created earlier, and handle updates it provides:  

```typescript
myInput({value: inputValue})

inputValue.subscribe(newValue => {
	console.log("Input value is changed: " + newValue)
})
```

And that's the basic idea of that library. Real-life use-cases can be more advanced, which is covered by following sections of this document.  

Note that boxes optimize their updates by comparing their old and new value with `===` operator. That means two things:  

1. You cannot trigger update by `myBox.set(myBox.get())`.
2. If your box contains an object - box won't be updated when the object is modified in-place. If you need to trigger an update - you need to create a new object with your new values. You should only modify fields of old object that needs to be modified; keeping values of old fields help other boxes to not trigger more updates than needed, see below.  

## Basic RBox usage

As you saw in previous example, there is `WBox`, which is writable box. It implies existence of `RBox`, which is readonly box. The difference is that you cannot put value in a readonly box.  
Every `WBox` is an `RBox`:  

```typescript
import {box, RBox} from "@nartallax/cardboard"

let myBox: RBox<number> = box(12345)

console.log(myBox.get()) // 12345
myBox.set(333) // Typescript's syntax error: no such method
```

So if, for example, your component won't ever need to push updates to the value and only need to observe changes of the value, you can type its property as `RBox` and pass `WBox` to it.  

By the way, internally all boxes in this library have all the methods `WBox` have, but calling them on boxes that are not `WBox` (i.e. `isWBox(x) === false`) could result in various bugs. Library expects you to rely on type-checking and not invoke methods that TypeScript won't let you invoke.  

## calcBox

The example above is not the only way to get the `RBox`. You can, for example, create a `calcBox`:

```typescript
import {box, calcBox} from "@nartallax/cardboard"

let a = box(5)
let b = box(10)
// first argument is list of dependent boxes; their values are passed to the callback
let sumOfAB = calcBox([a, b], (a, b) => a + b)

console.log(sumOfAB.get()) // 15

a.set(4)
console.log(sumOfAB.get()) // 14
```

In this example we create a `calcBox`; it's an `RBox` that depends on other box values. Each time any box it depends on updates - the value of `calcBox` is also updated (and subscribers are called, of course).  

## calcBox: reverse mapping

In the example above, `calcBox` is a readonly box; it is like that because if we were to set value on this box, the box wouldn't know how to distribute value to dependencies.  
We can fix that by passing third argument into `calcBox` creation function:  

```typescript
const obj = box({a: 5, b: 10})
const key = box<"a" | "b">("a")

// for example, let's create a calc box that picks a field from an object
// and a field is defined by some other box
const objByKey = calcBox(
	[obj, key],
	(obj, key) => obj[key],
	(value, obj, key) => [{...obj, [key]: value}, key]
)

// get value of field "a"
expect(objByKey.get()).to.be(5)

// toggle field to "b" - can get value of field "b", that's expected
key.set("b")
expect(objByKey.get()).to.be(10)

// and now! we can set the value of field "b" by setting value of calcBox
objByKey.set(15)
expect(obj.get()).to.eql({a: 5, b: 15})
```

## .map() method

Now you should be ready to understand how `.map()` method of the boxes works.  
`.map()` with one argument is present on both `RBox` and `WBox`; it creates a `calcBox` which only depends on that one box you created it off:  

```typescript
import {box} from "@nartallax/cardboard"

let b = box(10)
let bb = box.map(value => value + 5)

console.log(bb.get()) // 15

// above code is equivalent of
let bb = calcBox([b], b => b + 5)
```

`.map()` with two arguments is only present on `WBox`; it creates another `WBox` which synchronises its value with base box:

```typescript
import {box} from "@nartallax/cardboard"

let b = box(10)
let doubleB = box.map(
	value => value * 2, // get value of new box from b
	value => value / 2  // get value of b from new box's value
)

console.log(doubleB.get()) // 20

doubleB(8)
console.log(b.get()) // 4
```

## .prop() method

`.prop()` method is simplified (and optimized) version of `.map()` method, intended to use when you need to edit/display a complex object.  
It creates a `WBox` or `RBox` (depending on what kind of box it's invoked on) which hold a value of a property in the original box's value. For example:  

```typescript
import {box} from "@nartallax/cardboard"

let coords = box({x: 5, y: 10})
let xCoord = coords.prop("x")

console.log(xCoord.get()) // 5

// if source box is WBox, you should be able to put a new value in this property
// this value will be propagated upstream
xCoord.set(7)
console.log(coords) // {x: 7, y: 10}
```

## Working with arrays

Arrays, as most collections, are a bit harder to work with than more simple kinds of data.  
You can do much more with arrays - they can be sorted, new elements can be added, old elements can be removed; elements can be updated in place.  

To account for those cases, array context exists:

```typescript
import {box} from "@nartallax/cardboard"

const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}])

// here we create an array context based on parent box.
// this context manages a set of boxes that wrap individual elements of the array.
// context knows how to properly dispatch updates to elements by getKey callback
// this callback is supposed to create some stable key of an element of the array
// those keys are assumed to be unique within single array
const context = parent.getArrayContext(element => element.id)

// here we can get boxes for keys
// by the way, if parent is a RBox - those child boxes will also be RBoxes
const box1 = context.getBoxForKey(1)
const box2 = context.getBoxForKey(2)

// and those boxes are linked to parent array
box1.set({id: 1, name: "5"})
console.log(parent.get()) // [{id: 1, name: "5"}, {id: 2, name: "2"}]

// you cannot change key from inside the box, though
box1.set({id: 3, name: "5"}) // error! key changed

// also, if array is updated and no longer includes element that corresponds to the key of the element box,
// the element box will become detached, and all attempts to interact with it will result in error:
parent.set([{id: 2, name: "2"}])
console.log(box1.get()) // error! element detached

// array element boxes have a method to delete this specific element from parent array:
box2.deleteArrayElement()
console.log(parent.get()) // []
```

A callback to `.getArrayContext()` gets element value and index. In general, you should not use index as your item key; hovewer, in some scenarios it could be okay; for example, if you absolutely sure that array won't be sorted, elements won't be added or removed.  

## .mapArrayElements() method

If you don't need to work with individual boxes of the array - you can use `.mapArrayElements()` method.  
This method will do to array pretty much the same thing `.map()` does to regular boxes; two differences are that callback is invoked for each element of the array individually, and result of mapping is cached; that means mapper won't be invoked twice for same exact element:  

```typescript
const singleArr = box([1, 2, 3])
const doubleArr = singleArr.mapArrayElements(
	sourceElement => sourceElement * 2,
	doubledElement => doubledElement / 2
)
```

## .mapArray() method

There's another way to work with arrays - `.mapArray()` method.  
It's weird, because it gives box to a callback, but expects just a value, and that callback will only be called once per value; that means method expects callback to subscribe to the box and update mutable values themselves, which goes a bit against the rules, but here we are.  

```typescript
const parent = box([{id: 1, a: 1}, {id: 2, a: 2}, {id: 3, a: 3}])
const downstream = parent.mapArray(x => x.id, b => {
	const result = {b: b.get().a}
	b.subscribe(value => result.b = value.a)
	return result
})

console.log(downstream.get()) // [{b: 1}, {b: 2}, {b: 3}]

const arr = parent.get()
parent.set([arr[2]!, arr[0]!, arr[1]!])

console.log(downstream.get()) // [{b: 3}, {b: 1}, {b: 2}]
```

## constBox

`constBox` is a type of `RBox` that never changes its value.  
You can think of it as a `calcBox([], () => someConstant)`, but more optimized.  
This box exists because it's sometimes convenient to only write code in assumption that you will receive box and not a plain value.  
`constBoxWrap` is a way to use this convenience - if its argument is a `RBox`, then it will return the box; otherwise it will create a const box with argument as value.  

```typescript
import {constBox, constBoxWrap} from "@nartallax/cardboard"

const b = constBox(5)
console.log(b.get()) // 5

const bb = constBoxWrap(calcBox([], () => 12345))
console.log(bb.get()) // 12345

```

## Utility functions

There are some functions related to box manipulation:

```ts
let box: RBox<string> = box("owo")
console.log(isRBox(box)) // true
console.log(isWBox(box)) // true
console.log(isConstBox(box)) // false
console.log(unbox(box)) // "owo"

let callCount = 0
box.subcribe(() => callCount++)
withBoxUpdatesPaused(() => {
	box.set("uwu")
	box.set("ayaya")
})
console.log(callCount) // 1
```

## Partial update methods

There are other methods that exist on writable boxes, like `.setProp()`, `.setElementAtIndex()`, `.appendElements()`, `.deleteElements()` and many more. Calling one of those methods are usually more optimal way of doing the update; i.e. `b.setProp("x", 5)` is more optimal than `b.set({...b.get(), x: 5})`.  

The reason for that is partial updates.  
Partial update happens when boxes know what part exactly changed in a composite value, like object or array. This includes changing just one element of the array, or one property of the object. When box knows what exactly changed, it may skip delivering updates to other boxes that are certain to not react to them; if only one property of an object is changed - it is guaranteed that other properties of an object are not changed, which means that boxes that are result of a `.prop()` method for different property do not need to receive new value.  

In most cases it's fine to not use methods that cause partial updates. Boxes will figure out what's changed on their own. But if you can, and if you have a lot of data in boxes (thousands of elements in array, for example) - it's a good idea to use them.  

## Memory management considerations

There are some ways you may accidently create a memory leak using this library. So, let's outline most obvious of them:

1. Subscription to a box will hold in memory subscriber (and everything in its closure) as long as the box itself is in memory. It can be okay sometimes, if you are sure that the box and subscriber should always exist, but if you have, for example, dynamically created control - you may want to unsubscribe once the control is no longer needed; that will allow the control to be garbadge-collected.  
2. Downstream box always holds reference to its upstream:

```ts
let myBox: RBox<number> = box(5)
for(let i = 0; i < 100; i++){
	myBox = myBox.map(x => x + 1, x => x - 1)
}
```

In example above we create 100 boxes, but can actually use only last one. Other 99 boxes won't be garbadge collected as long as that last box is not garbadge collected.  

## Antipatterns

There are some ways of using this library that will result in worse performance or other weird bugs.

1. Avoid putting boxes inside boxes. Boxes exist to manipulate data, and putting something as complex as another box won't end well. Also that's complicates your code.  
2. Avoid getting value of other boxes from callback of `.map()` method. Those other boxes won't be included in the dependency list and won't trigger recalculation. Also sometimes this could mean getting outdated value from that other box.  
3. Avoid setting value of any box from inside callback of `.map()` or `calcBox()`. This means that a box will be updated out-of-order during update, and this will trigger double-update, that is, update within update; this will make library drop partial updates, and this will lead to decreased performance. Other than that it will probably be fine; it's okay to do that on a small scale, if you're trying to organize some smart calculation system consisting of several variables.  
4. Avoid having big chains of downstream boxes (`calcBox()`, `.map()`-boxes, `.prop()`-boxes, array element boxes) without subscribers. This will lead to reduced performance. When a downstream box without subscribers is accessed, it needs to check if new value needs to be calculated; to do that, it accesses its upstream boxes; if those boxes don't have subscribers either - they access their upstreams, and so on; (when a box is subscribed to, it can safely assume that its value is up-to-date on access, because it receives updates and can update its own value, so it won't try to access its upstreams). Only one box at the end of the chain needs to be subscribed to remedy this problem, because it will lead to other boxes also subscribing to their upstreams.

## Naming

Boxes are sometimes made of cardboard. Cardboard is also warm, flexible and generally pleasant material.  
