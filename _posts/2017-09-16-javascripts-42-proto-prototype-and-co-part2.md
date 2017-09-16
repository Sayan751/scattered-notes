---
layout: post
title:  "JavaScript's 42: proto, prototype & Co. (Part II)"
date:   2017-09-16 10:40:00+0100
categories: javascript
postid: "javascripts_42_proto_prototype_and_co_part2"
tags: [javascript, proto, prototype, inheritance, Object.create]
---

This is the second post on inheritance in JavaScript.
In the [first post]({{ site.baseurl }}{% post_url 2017-09-09-javascripts-42-proto-prototype-and-co %}) we have seen that how to use `proto`, and `prototype` to implement inheritance in JavaScript.
However, as the property `__proto__` is not *conveniently* available (for example in IDE and such), another way to write the same thing would be to use `Object.create`.

In this post we are going to discuss that.

## `Object.create` and inheritance ##

The syntax of `Object.create` is as follows:

{% highlight javascript %}
Object.create(proto[, propertiesObject])
{% endhighlight %}

`Object.create` creates an object, prototype of which is of type as provided by `proto`. <small>By using the second and optional `propertiesObject` additional properties to be added to the newly created object can be specified. Though, it can be useful to provide closure, we are skipping that discussion for now (Refer [this](https://stackoverflow.com/a/4166723/2270340)).</small>

Example:

{% highlight javascript %}
// create an object that does not inherit from anything.
var obj = Object.create(null);
console.log(obj.__proto__); // undefined

// create derv that inherit from base
var base = { b: "base" };
var derv = Object.create(base, {
    d: {
        get: function () { return "derived"; }
    }
});

console.log(derv.d);                    // derived
console.log(derv.b);                    // base
console.log(derv.__proto__ === base);   // true
{% endhighlight %}

So, how `Object.create` can be used to implement inheritance? Well, we know that for inheritance we need `Derived.prototype.__proto__ = Base.prototype`. From the above example, we can see that `Object.create` assigns `base` to `derv.__proto__`. Then to implement inheritance with `Object.create`, we simply need to do `Derived.prototype = Object.create(Base.prototype)`.

However, there are couple of things to note here. We'll discuss these with our working example of `Animal` and `Bird` (check [first post]({{ site.baseurl }}{% post_url 2017-09-09-javascripts-42-proto-prototype-and-co %})).

{% highlight javascript %}
function Animal() {}
Animal.prototype.walk = function () { console.log("Walk"); }

function Bird() {}
Bird.prototype.fly = function () { console.log("Fly"); }

// inherit from Animal
Bird.prototype = Object.create(Animal.prototype);

// now lets create a Bird object.
var bird = new Bird();

// and check for type of bird
console.log("Is bird a Bird? " + (bird instanceof Bird) + ", Is bird an Animal? " + (bird instanceof Animal));           // Is bird a Bird? true, Is bird an Animal? true // works!
bird.walk();        // Walk
bird.fly();         // TypeError: bird.fly is not a function // Wait... what?
{% endhighlight %}

We see that in the above example, `bird.fly()` does not work. The reason for that is very simple. `fly` is defined on `Bird.prototype`. However, after defining `fly` on `Bird.prototype`, `Bird.prototype` was replaced, and thus, the `fly` is not accessible any more. Therefore, the trick is to declare any member on `Derived.prototype` after `Derived.prototype` is assigned `Object.create(Base.prototype)`. Thus, the correction for this problem would be as follows.

{% highlight javascript %}
// Omitting Animal for brevity
function Bird() {}
Bird.prototype = Object.create(Animal.prototype);

Bird.prototype.fly = function () { console.log("Fly"); }

var bird = new Bird();
console.log("Is bird a Bird? " + (bird instanceof Bird) + ", Is bird an Animal? " + (bird instanceof Animal));           // Is bird a Bird? true, Is bird an Animal? true
bird.walk();        // Walk
bird.fly();         // Fly // works!
{% endhighlight %}

However, it still has one caveat though. Remember that `prototype` of every `function` has a property called `constructor`, which points to the function itself? So, [from MDN](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/constructor) we know that `prototype.constructor`
>Returns a reference to the Object constructor function that created the instance object. Note that the value of this property is a reference to the function itself...

So, lets see what happens to `prototype.constructor` with this implementation of inheritance.

{% highlight javascript %}
// Omitting more code for brevity
function Bird() {}
Bird.prototype = Object.create(Animal.prototype);

var bird = new Bird();
console.log(bird.constructor); // [Function: Animal] // Why?
{% endhighlight %}

In the example we see that `bird.constructor` refers to `Animal`. So, this is obvious as `Bird.prototype = Object.create(Animal.prototype);` also assigns `Animal.prototype.constructor` (which is `Animal`) to `Bird.prototype.__proto__.constructor`. So, if we leave our inheritance implementation at this, we violate the definition of `prototype.constructor`. Then, it is a good practice to restore the `constructor`.

{% highlight javascript %}
// Omitting more code for brevity
function Bird() {}
Bird.prototype = Object.create(Animal.prototype);
Bird.prototype.constructor = Bird;

var bird = new Bird();
console.log(bird.constructor); // [Function: Bird]
{% endhighlight %}

And that's all for this post. Note that we have not discussed regarding inheriting the statics and other instance-scoped properties in this post, as those stays more or less same. Thus, a mere repetition will not add much value. So, keeping this post short, we can stop here for now.

Hope this helps.