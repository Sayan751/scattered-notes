---
layout: post
title:  "JavaScript's 42: proto, prototype & Co."
date:   2017-09-09 21:52:04+0100
categories: javascript
postid: "javascripts_42_proto_prototype_and_co"
tags: [javascript, proto, prototype, inheritance]
---

After years of working with `.NET`, `SQL`, and `C#`, for last couple of years I am working with `TypeScript`, `Aurelia`, `Node.js`, and `Webpack` (of course after working with `SystemJs`).
Finally, now I have got the chance and the time to formally learn `JavaScript`. :smile:
As I am thoroughly enjoying the learning, I decided to jot down some rough notes about that.
So, there will be a series of posts about inheritance in JavaScript, and certainly we will be talking about `proto`, `prototype` & Co. in these posts.
So the posts are more for me, rather than for you. If you like it then it is a bonus for me. :smile: If you have any feedback, please don't hesitate to leave a comment.

- [`__proto__`](#__proto__)
- [`prototype`](#prototype)
- [`__proto__` and inheritance](#__proto__-and-inheritance)
  - [Basics](#basics)
  - [Accessing instance-scoped properties of base class](#accessing-instance-scoped-properties-of-base-class)
  - [Accessing static members of base class](#accessing-static-members-of-base-class)

## `__proto__` ##

Every JavaScript object has a property called `__proto__`. Example:

{% highlight javascript %}
var obj = {a: 10};
console.log(obj);           // { a: 10 }
console.log(obj.__proto__); // {}
{% endhighlight %}

The example above shows that `__proto__` of `obj` is defined but empty.

When we try to access the member of an object (like `object.member`), JavaScript looks up for the member in `__proto__` of the object if the member is not found in the object itself (like `object.__proto__.member`). If the member is still not found in `object.__proto__`, then it tries for `object.__proto__.__proto__.member`

> till either: it is found or the latest `.__proto__` itself is `null`. This explains why JavaScript is said to support prototypal inheritance out of the box. - From [TypeScript Deep Dive](https://basarat.gitbooks.io/typescript/content/docs/classes-emit.html).

{% highlight javascript %}
var obj = {
    a: 10
};
obj.__proto__.a = 20;

console.log(obj.a); // 10

delete obj.a;

console.log(obj.a); // 20
{% endhighlight %}

## `prototype` ##

Every `function` `f` in JavaScript also has a property called `prototype`, which has a property `constructor` which points to `f` itself. Example:

{% highlight javascript %}
function MyFun() {}
console.log(MyFun);                                 // [Function: MyFun]
console.log(MyFun.__proto__);                       // [Function]
console.log(MyFun.prototype);                       // MyFun {}
console.log(MyFun.prototype.constructor);           // [Function: MyFun]
console.log(MyFun.prototype.constructor === MyFun); // true
{% endhighlight %}

## `__proto__` and inheritance ##

### **Basics** ###

Because JavaScript tries to fetch member from `__proto__` recursively, `__proto__` is useful to implement prototypical inheritance.
A simple way to implement inheritance would be to assign `<Base>.prototype` to `__proto__.__proto__` to an object which wants capabilities of `<Base>`. Example:

{% highlight javascript %}
// We have two classes (function in pure JavaScript) Animal, and Bird
function Animal() {}
Animal.prototype.walk = function () { console.log("Walk"); }

function Bird() {}
Bird.prototype.fly = function () { console.log("Fly"); }

var bird = new Bird();
bird.fly();         // Fly
bird.walk();        // Throws error.

// However, if we do the following, then...
bird.__proto__.__proto__ = Animal.prototype;
// ... it works.
bird.walk(); // Walk

console.log("Is bird a Bird? " + (bird instanceof Bird) + ", Is bird an Animal? " + (bird instanceof Animal));  // Is bird a Bird? true, Is bird an Animal? true
{% endhighlight %}

We note here that `fly` is defined on `Bird.prototype`, and we access that from `bird` object. This is possible as `fly` is made available to `bird.__proto__`, by `new Bird()`.

In fact, `var bird = new Bird()` assigns `Bird.prototype` to `bird.__proto__`. In JavaScript, this makes all members defined on class level (i.e. `Type.prototype`, here `Bird.prototype`) to the instances of that class (Refer [this](https://stackoverflow.com/a/14593952/2270340)).

The fact that `bird.__proto__ === Bird.prototype` enables us to write the inheritance for the `Bird` class from `Animal` class more concisely, as follows.

{% highlight javascript %}
// We have two classes (function in pure JavaScript) Animal, and Bird
function Animal() {}
Animal.prototype.walk = function () { console.log("Walk"); }

function Bird() {}
Bird.prototype.fly = function () { console.log("Fly"); }
Bird.prototype.__proto__ = Animal.prototype;  //<-- Nice!

var bird = new Bird();
bird.fly();         // Fly
bird.walk();        // Walk

console.log("Is bird a Bird? " + (bird instanceof Bird) + ", Is bird an Animal? " + (bird instanceof Animal));  // Is bird a Bird? true, Is bird an Animal? true
{% endhighlight %}

**Note:** From [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof):
>The `instanceof` operator tests whether an object in its prototype chain has the prototype property of a constructor.

### **Accessing instance-scoped properties of base class** ###

So far our inheritance implementation works quite good. So, lets consider other scenarios. With inheritance, we can access the instance-scoped properties of the class. Let's see if we can do that using our implementation of inheritance. So, let's add new properties to the classes.

{% highlight javascript %}
function Animal() { this.claws = "An animal has claws"; }

function Bird() { this.wings = "A bird has wings"; }
Bird.prototype.__proto__ = Animal.prototype;

var bird = new Bird();
console.log(bird.wings); // A bird has wings
console.log(bird.claws); // undefined
{% endhighlight %}

So we see that using our current implementation, we can't access the instance-scoped property `claws` which is defined in `Animal`.

However, before delving into that, let's quickly discuss what `this` means with `new Bird()`. From [TypeScript Deep Dive](https://basarat.gitbooks.io/typescript/content/docs/classes-emit.html):
>... let's look at effect of `new` on `this` inside the called function. Basically `this` inside the called function is going to point to the newly created object that will be returned from the function. ...

Example:

{% highlight javascript %}
var bird = new Bird();
console.log(bird.wings);           // A bird has wings
console.log(bird.__proto__.wings); // undefined
{% endhighlight %}

So, from the example we see that `this` in the function eventually points to `bird` object (instance of `Bird`), and thereby making all the properties declared on `this` inside the function, available to the `bird` object. Additionally we also note that `wings` exists directly on `bird` object and not on `bird.__proto__`.

So to reuse the properties defined in base classes from the instance of the derived classes, we need to *put* the properties of base class to the `this` object of derived class. The common way to achieve this is to call the constructor of base class from the constructor of derived class (like we do in C#, or Java).

{% highlight javascript %}
function Animal() { this.claws = "An animal has claws"; }

function Bird() {
    Animal.call(this); // Calling the constructor of Animal, passing this as current object.
    this.wings = "A bird has wings";
}
Bird.prototype.__proto__ = Animal.prototype;

var bird = new Bird();
console.log(bird.wings); // A bird has wings
console.log(bird.claws); // An animal has claws
{% endhighlight %}

So the trick to call the constructor of `Animal` class is to use `Animal.call(this);` in constructor of `Bird`. Here we need a few words about `function.call`. From [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/call):
>The `call()` method calls a function with a given `this` value and arguments provided individually.

Syntax:
>```function.call(thisArg, arg1, arg2, ...)```
Where `thisArg` is
>The value of this provided for the call to a function. ...

and `arg1, arg2, ...` are
>Arguments for the function.

A quick example of `function.call` is following.

{% highlight javascript %}
function aggregate(prefix) {
    console.log(`${prefix} ${this.prop1+this.prop2}`);
}

var thisObj1 = { prop1: 10, prop2: 20 };
var thisObj2 = { prop1: "Hello", prop2: "World" };

aggregate.call(thisObj1, "thisObj1 aggregated:"); // thisObj1 aggregated: 30
aggregate.call(thisObj2, "thisObj2 aggregated:"); // thisObj2 aggregated: HelloWorld
{% endhighlight %}

We see that based on different values of `thisArg` parameter we can produce different results from the same function.

And this is what is done to inherit the instance-scoped properties from the Base class. So we call `Base.call(this)` from the constructor of `Derived`, where `this` points to the instance of `Derived` being constructed, and thereby *putting* the properties of `Base` to the instance of `Derived`.

### **Accessing static members of base class** ###

So we are almost done. One last thing is to inherit the `static` members. Yes, using JavaScript that is possible. So the first question is to how to have `static` members in classes in JavaScript.

Well `static` members roughly refers to the members those are tied with class and not to the instances of the class, and thus when the `static` members are updated, the updated value is available to all the instances of the class. So we access the `static` members are accessed like `ClassName.staticMember`, or `ClassName.staticMethod()`, and that is what we need to implement the `static` members in class. Example:

{% highlight javascript %}
function StaticDemo(prop1) {
    this.instanceProp = prop1;
    StaticDemo.staticProp++;
}
StaticDemo.staticProp = 0;          // a static property
StaticDemo.prototype.print = function () {
    console.log(`Instance prop: ${this.instanceProp}, static prop: ${StaticDemo.staticProp}`);
}

var instance1 = new StaticDemo(10);
instance1.print();                  // Instance prop: 10, static prop: 1
var instance2 = new StaticDemo(20);
instance1.print();                  // Instance prop: 10, static prop: 2
instance2.print();                  // Instance prop: 20, static prop: 2
{% endhighlight %}

So to create a `static` property on class, we can simply define a property on the `Class`, like it is done for `StaticDemo.staticProp`. Recalling that `var instance = new Class()` assigns the `Class.prototype` to `instance.__proto__`, a class member defined not on `prototype` and directly on `Class` instead, the member does not get *tied* with instances created and rather stays *attached* with the `Class`. And that's how the static properties are created in JavaScript.

So how to inherit the `static` members? Well, that is just a simple matter of copying the member (value-copy for simple-typed member, and reference-copy for object-typed member) from one place to another. So to do that we need another piece of function, as shown below.

{% highlight javascript %}
var inheritStatics = function (derived, base) {
    for (var p in base)
        if (base.hasOwnProperty(p)) derived[p] = base[p];
};
{% endhighlight %}

From [`for...in` documentation in MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...in):
>A `for...in` loop only iterates over enumerable properties.

and from [`hasOwnProperty()` documentation in MDN](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwnProperty):

>The `hasOwnProperty()` method returns a boolean indicating whether the object has the specified property as own (not inherited) property.

So the function `inheritStatics` copies the properties defined on `base` to `derived`. In general, `base`, and `derived` can be any two general objects. Example:

{% highlight javascript %}
var obj1 = {
    prop1: 1,
    innerObj: {
        inner1: 10
    }
};

var obj2 = {
    propa: "A"
};

inheritStatics(obj2, obj1);
console.log(obj2);                            // { propa: 'A', prop1: 1, innerObj: { inner1: 10 } }
console.log(obj1.innerObj === obj2.innerObj); // true // reference of the object is copied.
{% endhighlight %}

Lastly, we see it in action for inheriting `static`s from base class to derived class.

{% highlight javascript %}
function Animal() {
    this.claws = "An animal has claws";
    Animal.population++;
}
// a static property
Animal.population = 0;
// a static method
Animal.printPopulation = function () {
    console.log(`Bird population: ${Bird.population}, Fish population: ${Fish.population}, Animal population: ${Animal.population}`);
}

function Bird() {
    Animal.call(this);
    this.wings = "A bird has wings";
    Bird.population++;
}
inheritStatics(Bird, Animal);
Bird.prototype.__proto__ = Animal.prototype;

function Fish() {
    Animal.call(this);
    this.fins = "A fish has fins";
    Fish.population++;
}
inheritStatics(Fish, Animal);
Fish.prototype.__proto__ = Animal.prototype;
// override the static method
Fish.printPopulation = function(){
    console.log(`From Fish.printPopulation: Bird population: ${Bird.population}, Fish population: ${Fish.population}, Animal population: ${Animal.population}`);
}

new Bird();
Animal.printPopulation();   // Bird population: 1, Fish population: 0, Animal population: 1
new Bird();
Bird.printPopulation();     // Bird population: 2, Fish population: 0, Animal population: 2
new Fish();
Fish.printPopulation();     // From Fish.printPopulation: Bird population: 2, Fish population: 1, Animal population: 3
new Fish();
Animal.printPopulation();   // Bird population: 2, Fish population: 2, Animal population: 4
console.log(Animal.printPopulation === Bird.printPopulation, Animal.printPopulation === Fish.printPopulation);      // true false
{% endhighlight %}

So, yes, on ground level that's all we need to implement inheritance in JavaScript. This is quite something right?

Well this has been a long post, as per my standard. However, there is still somethings left to discuss on this topic, which I am going to discuss on future posts.

Hope this helps.