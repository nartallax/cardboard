# Cardboard

Data logistics TS library, for those who are nostalgic of Knockout's observables.  
It allows you to organize data flow in your project. Intended to use in frontend applications, but not bound to any runtime.  

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

	// to get value of the box we just call it without arguments
	let currentValue = props.value()

	setTimeout(() => {
		// here we emulate user input.
		// in real world it will be an event handler, but this is simplified example
		// when we want to update value of the box - we call it with some value
		props.value(currentValue + " is changed")
	}, 1000)

	// here we subscribe to changes in the value,
	// because we want to update value of our input each time its value is changed
	let unsubscribe = props.value.subscribe(newValue => {
		// in real life you probably want to set input's value or something like that
		console.log("The value is updated! Now it is " + newValue)
	})
	
	// note that you need to call `unsubscribe` when input is destroyed
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

And that's the basic idea of that library. Real-life use-cases can be more advanced, which is covered by following sections.  

Note that boxes optimize their updates by comparing their old and new value with `===` operator. That means two things:  

1. You cannot trigger update by `myBox(myBox())`.
2. If your box contains an object - box won't be updated when the object is modified inplace. If you need to trigger an update - you need to create a new object with your new values. You should keep old object's property values though, as it will help `.prop` boxes to not update too much (see below)

## Basic RBox usage

As you saw in previous example, there is `WBox`, which is writable box. It implies existence of `RBox`, which is readonly box. The difference is that you cannot put value in a readonly box.  
Every `WBox` is an `RBox`:  

```typescript
import {box, RBox} from "@nartallax/cardboard"

let myBox: RBox<number> = box(12345)

console.log(myBox()) // 12345
myBox(333) // Typescript's syntax error
```

So if, for example, your component won't ever need to push updates to the value and only need to observe changes of the value, you can type its property as `RBox` and pass `WBox` to it.

## RBox views

The example above is not the only way to get the `RBox`. You can, for example, create a `viewBox`:

```typescript
import {box, viewBox} from "@nartallax/cardboard"

let a = box(5)
let b = box(10)
let sumOfAB = viewBox(() => a() + b())

console.log(sumOfAB()) // 15
```

In this example we create a `viewBox`; it's an `RBox` that depends on other box values. Each time any box it depends on updates - the value of `viewBox` is also updated.  
(disclaimer: implementation is more complex than that, but for outside world it looks like it is; you can assume that it does update each time)  

## map method

Now you should be ready to understand how `.map` method of the boxes works.  
`.map` with one argument is present on both `RBox` and `WBox`; it creates a `viewBox` which only depends on that one box you created it off:  

```typescript
import {box} from "@nartallax/cardboard"

let b = box(10)
let bb = box.map(value => value + 5)

console.log(bb()) // 15

// above code is equivalent of
let bb = viewBox(() => b() + 5)
```

`.map` with two arguments is only present on `WBox`; it creates another `WBox` which synchronises its value with base box:

```typescript
import {box} from "@nartallax/cardboard"

let b = box(10)
let doubleB = box.map(
	value => value * 2, // get value of new box from b
	value => value / 2  // get value of b from new box's value
)

console.log(doubleB()) // 20

doubleB(8)
console.log(b()) // 4
```

## prop method

`.prop` method is simplified (and optimized) version of `.map` method, intended to use when you need to edit/display a complex object.  
It creates a `WBox` or `RBox` (depending on what kind of box it's invoked on) which hold a value of a property in the original box's value. For example:  

```typescript
import {box} from "@nartallax/cardboard"

let coords = box({x: 5, y: 10})
let xCoord = coords.prop("x")

console.log(xCoord()) // 5

// if source box is WBox, you should be able to put a new value in this property
// this value will be propagated upstream
xCoord(7)
console.log(coords) // {x: 7, y: 10}
```

## wrapElements method

This method only exists for boxes that contain arrays.  
As you can see in example above, you can create "downstream" boxes of objects which will be synchronised with "upstream" boxes, which is great; but arrays are a little different than objects. When you have object - you can reasonably assume that each field of that object contains its own value that can't suddenly become other field value; with arrays, you can freely reorder elements, add or remove them.  
So, to properly support arrays, `.wrapElements` method exists. It wraps each element inside the array in its own box; then it creates a new `RBox` which holds boxes of individual elements. To allow for element boxes to be updated properly, user is expected to provide a function that extracts ID of each element; IDs assumed to be unique within an array:

```typescript
import {box} from "@nartallax/cardboard"

const parent = box([{id: 1, name: "1"}, {id: 2, name: "2"}])
const wrapper = parent.wrapElements(x => x.id)
const [box1, box2] = wrapper()

console.log(box1, box2) // {id: 1, name: "1"}, {id: 2, name: "2"}

// you can change the value of array's elements, and change will be propagated upstream:
box1({id: 1, name: "new name"})
console.log(parent()) // [{id: 1, name: "new name"}, {id: 2, name: "2"}]

{
	// you can reorder values in the source array
	let [a, b] = parent()
	parent([b, a])

	// same box instances retain same values, bound by ID
	console.log(box1, box2) // {id: 1, name: "new name"}, {id: 2, name: "2"}

	// wrapper array has box instances reordered
	console.log(wrapper()[0] === box2, wrapper()[1] === box1) // true, true
}
```

There's a catch to using this method: when a value leaves array, the box it is bound to is orphaned. That means changes to its value won't be propagated to upstream array, because there's nowhere to propagate. Even if later a value with the same ID appears in source array again - a new box will be created for that value, and old box will still be orphaned.  
To help you notice such situations easier, orphaned boxes will throw an error when a value is set to them.  

## Naming

Boxes are usually made of cardboard. Cardboard is also warm, flexible and generally pleasant material.  
