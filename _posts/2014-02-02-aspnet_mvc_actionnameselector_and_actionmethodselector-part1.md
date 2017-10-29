---
layout: post
title:  "ASP.NET MVC: ActionNameSelector and ActionMethodSelector (or another approach to submit form to multiple action methods) – Part I"
date:   2014-02-02 11:04:00+0530
categories: asp.net
postid: "aspnet_mvc_actionnameselector_and_actionmethodselector-part1"
tags: [.net, actionmethodselector, actionnameselector, asp.net mvc, mvc, submit form to multiple action methods]
---
At work I have recently faced a requirement to post a single form to multiple `Action` methods in a controller based on the context. For example, in the view there is a Form and there are several radio buttons; now my form should be posted to the `Action` method based on the radio button selection.
As usual I Googled it and found that internet is glutted with various approaches. Some of them are:

1. Posting to single action method and use a switch mechanism inside it,
1. Using multiple forms,
1. Using named submit button and assigning different values to those.

However there is one concept that I liked most and that is making use of `ActionNameSelector` and `ActionMethodSelector`.

## What are these? ##

Well these are attributes that influence/affects the selection of action methods… yes you got it right. I’ve quoted it from MSDN and just like some of you (maybe) I didn't understood a thing when I read those lines... :wink:
You can check the below MSDN links:
[ActionNameSelectorAttribute Class](http://msdn.microsoft.com/en-us/library/system.web.mvc.actionnameselectorattribute%28v=vs.118%29.aspx), [ActionMethodSelectorAttribute Class](http://msdn.microsoft.com/en-us/library/system.web.mvc.actionmethodselectorattribute%28v=vs.118%29.aspx).
Hmm… so what are these anyway.

Just as the names suggest,

- **ActionNameSelector** selects the `Action` methods matching name with the one in `RouteData`, from the `Action` methods available in the controller, and
- **ActionMethodSelector** selects one single method from the ones selected by `ActionNameSelector`.

Still not clear?

Well, here are some examples which may help.
One `ActionNameSelector` attribute that is shipped with ASP.NET MVC is `ActionNameAttribute` that you use to give same name to two or more action methods in your controller.

And `HttpPost` is an example of `ActionMethodSelector` attribute that is shipped with ASP.NET MVC that you use to select the action method at the time of form post.

You must check the GitHub links: [ActionMethodSelector](https://github.com/ASP-NET-MVC/aspnetwebstack/blob/master/src/System.Web.Mvc/ActionMethodSelector.cs), [HttpPost](https://github.com/ASP-NET-MVC/aspnetwebstack/blob/master/src/System.Web.Mvc/HttpPostAttribute.cs), [AcceptVerbsAttribute](https://github.com/ASP-NET-MVC/aspnetwebstack/blob/master/src/System.Web.Mvc/AcceptVerbsAttribute.cs).

So imagine you have a `HomeController` and two `Action` methods both named `Index`, one for `GET` and another for `POST`. Now when the form is posted, MVC's default action name selector attribute selects both the action methods as `RouteData` has the action name as `Index` (considering you are posting the form to the `Index` `Action` method only). Now after `ActionNameSelector` is done with its job, `ActionMethodSelector` comes into picture and tries to find out the ONE action method that may do the job. Now consider hypothetically that there is no `ActionMethodSelector` (or any other influencing factor) present, hence at this point you have both the action methods selected. And if that is the case having two `Action` Methods selected that can’t be filtered further, MVC will raise an exception of ambiguous action methods. As you may already know that one and only action method needs to be selected at end, otherwise MVC will raise exception (Note that parameters in action methods has nothing to do with influencing the selection of action method).

So, `ActionMethodSelector` does the second level of filtering.

The same thing is explained in the below code sample:
Assume you have following controller:

{% highlight csharp %}
public class HomeController : Controller
{
    // GET: /Home/
    public ActionResult Index()
    {
        ViewBag.Msg = "GET Index";
        return View();
    }

    public ActionResult Index(int id)
    {
        return View();
    }

}
{% endhighlight %}

When you run this application, you get following exception as both `Index` methods are selected by MVC's default Action Method Selector.

![Ambiguous method name](http://2.bp.blogspot.com/-4WKDxPGZvqk/Uu3Oew59yTI/AAAAAAAABfw/qGdOPs-a-RA/s1600/Ambiguous+Method+Name+1.JPG)

So to fix this (and also to POST your form properly) you put a `[HttpPost]` attribute on the top of the second action method which looks like below and your controller executes fine now:

{% highlight csharp %}
public class HomeController : Controller
{
    // GET: /Home/
    public ActionResult Index()
    {
        ViewBag.Msg = "GET Index";
        return View();
    }

    [HttpPost]
    public ActionResult Index(int id)
    {
        return View();
    }
}
{% endhighlight %}

As already told `HttpPost` is an Action Method Selector and filters the one proper action method to be executed.

Lets add a bit more complexity by adding a new Action Method and add an `ActionNameAttribute` - which portrays the new action method  as another `Index` - and an `HttpPost` on top of that, just like below and try to post the form again:

Controller:
{% highlight csharp %}
public class HomeController : Controller
{
    public ActionResult Index()
    {
        return View();
    }

    [HttpPost]
    public ActionResult Index(int id)
    {
        return View();
    }

    [HttpPost,ActionName("Index")]
    public ActionResult JustAnotherAction(int id)
    {
        return View();
    }

}
{% endhighlight %}

View:

{% highlight csharp %}
@{
    ViewBag.Title = "Index";
}

<h2>Index</h2>

@using(Html.BeginForm()){
@:ID: <input name="id" type="text" />
    <input type="submit" value="Submit"/>
}
{% endhighlight %}

So now if you try to post the Form you will get the following error:

![Ambiguous method name](http://4.bp.blogspot.com/-4C1Y__ILhOA/Uu3OEm_-5PI/AAAAAAAABfU/QubKzD_Rkss/s1600/Ambiguous+Method+Name2.JPG)

Now if you change the `HttpPost` attribute on `JustAnotherAction` - the third action method – to `HttpDelete` or `HttpPut`, it will not be selected when you again post the form and hence the MVC application will not raise any error.

That’s all for today. I wish to write another part of this story depicting how to make your own `ActionMethodSelector`, the link for which I’ll provide very shortly (at least that is what I believe).

P.S.: Here is the link to the second part of the article.

Hope this helps.

**Disclaimer:** This post is moved as is (with minor formatting change) from my [old blog](http://programersnotebook.blogspot.de/2014/02/aspnet-mvc-actionnameselector-and.html).
