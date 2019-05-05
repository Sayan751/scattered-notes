---
layout: post
title:  "The pursuit of JSON.stringify"
date:   2019-05-03 10:30:00+0100
categories: javascript
postid: "the_pursuit_of_json_stringify"
tags: [typescript, javascript, json, stringify, symbol]
---

**TL;DR**: In this post, I briefly explored the humble `JSON.stringify`. In that sense it is not an exhaustive guide for that. Thereafter, a `@decorator` + `Symbol` based solution is presented to elegantly mark properties to be excluded from JSON.

Few days back at work, I was getting my code reviewed from one of my colleagues. The code that was being reviewed was written for a requirement, which involves serializing a JavaScript object as JSON for persisting in database/backend store. The target objects for serialization are instances of a particular class that contains properties, which need to be ignored for serialization. For example, the values of those properties does not needed to be persisted or could not be serialized, due to complex [circular reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#Issue_with_JSON.stringify()_when_serializing_circular_references). As an example, let us consider the following class.

{% highlight typescript %}
class Target {
    public ignored = "test";
    constructor(public x: number) { }
}
{% endhighlight %}

And when an instance of `Target` is serialized we want it to be `{"x": value_of_x}` instead of `{"x": value_of_x, "ignored": "test"}`.

Now you maybe thinking at this point that is easy peasy. A [replacer parameter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#The_replacer_parameter) can certainly be used to ignore those properties, either an array to whitelist the properties...

{% highlight typescript %}
JSON.stringify(target, ["x", "otherWhiteListedProp"]);
{% endhighlight %}

... or a full-fledged replacer function for more involved cases.
{% highlight typescript %}
JSON.stringify(target, function(key, value){
    // do your magic here
});
{% endhighlight %}

The problems with this replacer approach are the following. With the addition of future ignored or non-ignored properties we might need to update the replacer. Moreover, the logic of ignoring the properties is not at all encapsulated with the class. I know you are ready with a [`toJSON` solution](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#The_replacer_parameter) to fix the encapsulation that may look something like below.

<iframe height="400px" width="100%" src="https://repl.it/@Sayan751/toJSON?lite=true" scrolling="no" frameborder="no" allowtransparency="true" allowfullscreen="true" sandbox="allow-forms allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-modals"></iframe>

However, things get more complicated when this class is inherited, and new properties, ignored or otherwise, are introduced by the derived class. If we walk this road of `toJSON`, we may end up having multiple overridden versions of this method in multiple classes, which does not seem like a clean solution.

What I came up with instead is a solution involving `Symbol`. As `Symbol`-keyed properties are ignored completely during serialization (refer [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#Description)), using a symbol for the "ignored" properties seemed like perfect choice.

<iframe height="400px" width="100%" src="https://repl.it/@Sayan751/TargetWithSymbol?lite=true" scrolling="no" frameborder="no" allowtransparency="true" allowfullscreen="true" sandbox="allow-forms allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-modals"></iframe>

Now you can imagine what happens if there are multiple properties to ignore for JSON; we end up with lot of symbol, one for each "ignored" property. And again that is not a particularly clean solution.

My reviewer colleague, being a C# pro dev, reminded me of this nice [`JsonIgnoreAttribute` from Json.NET](https://www.newtonsoft.com/json/help/html/PropertyJsonIgnore.htm) which when applied on a property, prevents serialization of that property value.

## @decorator to rescue

`@decorator`s can be considered as somewhat similar to the idea of Attributes in C#, in the sense that both embodies the idea of decorator pattern. Therefore, the alternative idea for ignoring properties for JSON, is to write a decorator that facilitates that, and apply that decorator on the properties, to be ignored. With this notion, I came up with the following as my first attempt.

### Attempt#1

<iframe height="400px" width="100%" src="https://repl.it/@Sayan751/jsonIgnore-variant1?lite=true" scrolling="no" frameborder="no" allowtransparency="true" allowfullscreen="true" sandbox="allow-forms allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-modals"></iframe>

What we have here is a [property decorator](https://www.typescriptlang.org/docs/handbook/decorators.html), that takes the prototype of the class, and the name of the target property as arguments. Then it returns a property descriptor, that is in turn applied on the property of the class. If you are interested, I would encourage you to take a look at the JavaScript source generated by TypeScript compiler. The code generated for decorator looks something like below (your TypeScript version may produce a slightly different version).

{% highlight javascript %}
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
{% endhighlight %}

The key thing to note here is the `Object.defineProperty(target, key, r)` on the `return` statement. This means that the property descriptor returned from the decorator is applied on the property. The property descriptor redefines the property with `get`/`set` accessors, backed by a new underlying property named as `_${key}` (i.e. when the decorator is applied on a property `ignored` it creates the backing property as `_ignored`). Furthermore, the `set` accessor defines the new property as non-enumerable (`enumerable: false`), which ensures that when an instance of the target class serialized, the backing property is never included in that (you may verify this from the repl below).

<iframe height="400px" width="100%" src="https://repl.it/@Sayan751/non-enumerable?lite=true" scrolling="no" frameborder="no" allowtransparency="true" allowfullscreen="true" sandbox="allow-forms allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-modals"></iframe>

Moreover, as the `target` in `Object.defineProperty(target, key, r)` is the prototype of the class, the property is (re)defined for the `Class.prototype` (for our example, it is `Target.prototype`). This also causes the exclusion of this property from the serialized JSON. This may not come as a surprise, due to the fact that the `get` accessors are also not serialized, as those are defined the very same way on `Class.prototype` (check the example below). The behavior is in accordance with the [specs of `JSON.stringify`](https://www.ecma-international.org/ecma-262/6.0/#sec-json.stringify) (if you are interested, traverse the specs till [EnumerableOwnNames ](https://www.ecma-international.org/ecma-262/6.0/#sec-enumerableownnames) from [SerializeJSONObject](https://www.ecma-international.org/ecma-262/6.0/#sec-serializejsonobject)).

{% highlight typescript %}
// Example of the source code generated for a class with get accessor

// A class with get accessor
class Test {
    public get y() { return 2; }
    constructor(public x: number) { }
}

// generated JavaScript by tsc
var Test = /** @class */ (function () {
    function Test(x) {
        this.x = x;
    }
    Object.defineProperty(Test.prototype, "y", {
        get: function () { return 2; },
        enumerable: true,
        configurable: true
    });
    return Test;
}());
{% endhighlight %}

### Attempt#2 (final)

Though the previous attempt work, it can be made much simpler. In fact when the backing property is made `Symbol`-keyed, we don't have to even bother about making the backing property non-enumerable (in this context). As previously indicated, all `Symbol`-keyed properties are by default ignored by `JSON.stringify`. Applying this notion, we have the final version of this decorator below.

<iframe height="400px" width="100%" src="https://repl.it/@Sayan751/jsonIgnore-variant3?lite=true" scrolling="no" frameborder="no" allowtransparency="true" allowfullscreen="true" sandbox="allow-forms allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-modals"></iframe>

This looks a lot simpler than the previous version. The property descriptor ensure that the property remains writable, but as the backing property is `Symbol`-keyed, it is automatically excluded from the JSON. Moreover, it is more performant than the previous (next section).

### Performance comparison

To formally compare the performance of the 2 variants, I cooked up the following code. In this code, there are 2 target classes, and each variant of the decorator is applied on a property of each class. Then a similar code fragment for each class is tested in iteration. The iteration ranges from 10 to 1e+07. The code fragment instantiates an object of the target class, reads and writes the ignored property, and lastly performs a `JSON.stringify` on the object.

{%- highlight typescript -%}
class Target1 {
  @jsonIgnore1 public ignored: number;
  constructor(public x: number) { }
}

class Target2 {
  @jsonIgnore2 public ignored: number;
  constructor(public x: number) { }
}

const iterations = [10, 100, 1e3, 1e6, 5e6, 1e7];
const perfData = [];
for (const iteration of iterations) {
  let start, duration1, duration2, duration3;
  start = performance.now();
  for (let i = 0; i < iteration; i++) {
    const obj = new Target1(Math.random());
    obj.ignored = Math.random();
    Math.random() + obj.ignored;
    JSON.stringify(obj);
  }
  duration1 = performance.now() - start;

  start = performance.now();
  for (let i = 0; i < iteration; i++) {
    const obj = new Target2(Math.random());
    obj.ignored = Math.random();
    Math.random() + obj.ignored;
    JSON.stringify(obj);
  }
  duration2 = performance.now() - start;

  perfData.push({
    iteration,

    duration_variant1: duration1,
    avg_duration_variant1: (duration1 / iteration),

    duration_variant2: duration2,
    avg_duration_variant2: (duration2 / iteration)
  })
  console.log(`Done for iteration ${iteration}`);
}
{%- endhighlight -%}

You can run the code, use your favorite visualization tool to generate charts, and see if it closely matches the results presented in this post. For convenience, I am adding the result of a sample run.

|Iteration|Variant#1<br>Total (d1)| Variant#1<br>Average| Variant#2<br>Total (d2)| Variant#2<br>Average| d1/d2|
|---:|---:|---:|---:|---:|---:|
|10|0.9774|0.0977|0.1089|0.0109|8.971|8.971|
|100|2.074|0.0207|0.1437|0.0014|14.434|14.434|
|1000|2.6187|0.0026|1.5786|0.0016|1.6589|1.6589|
|1e+06|1741.3541|0.0017|870.619|9e-04|2.0001|2.0001|
|5e+06|8770.4606|0.0018|4104.5207|8e-04|2.1368|2.1368|
|1e+07|17333.5307|0.0017|8173.5535|8e-04|2.1207|2.1207|
{:.table .table-striped}

![Performance chart](/images/jsonIgnore.svg "Performance comparison between 2 variants of @jsonIgnore")

From this result, it is clear that the second variant of the decorator is more performant than the first one. And in general, the first one takes 2x more time than the second one.

## Summary

This post has explored briefly the `JSON.stringify`. For a long time it never crossed my the amount of complexity that is involved behind this humble function. Moreover, it also presented a solution based on `@decorator` and `Symbol` to elegantly mark properties to be excluded from the serialized JSON. My personal opinion is that is a far better way, in this context, than applying either replacer or `toJSON`.

Hope this helps.