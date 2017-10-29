---
layout: post
title:  "ASP.NET MVC: ActionNameSelector and ActionMethodSelector (or another approach to submit form to multiple action methods) – Part II"
date:   2014-02-02 19:42:00+0530
categories: asp.net
postid: "aspnet_mvc_actionnameselector_and_actionmethodselector-part1"
tags: [.net, actionmethodselector, actionnameselector, asp.net mvc, mvc, submit form to multiple action methods]
---
Hope you enjoyed the [first part]({{ site.baseurl }}{% post_url 2014-02-02-aspnet_mvc_actionnameselector_and_actionmethodselector-part1 %}) of this blog post.

In this part I'll discuss about how you can make your own `ActionMethodSelector` Attribute (though I'll use the out-of-the-box `ActionNameSelectorAttribute` `ActionNameAttribute`).

Lets first discuss the problem statement: I've one form which has two radio buttons and I want the form to be posted to two different Action Methods based on selection.

So here is the view:
{% highlight csharp %}
@{
    ViewBag.Title = "Index";
}

<h2>Index</h2>

@using (Html.BeginForm())
{
    @:ID: <input name="id" type="number" />
    <br />
    <input type="radio" value="action1" name="selector"/> @:Option1 
    @:&nbsp; &nbsp; 
    <input type="radio" value="action2"  name="selector" />@:Option2
    <br />
    <input type="submit" value="Submit" />
}

@ViewBag.Msg
{% endhighlight %}

And here is my controller:

{% highlight csharp %}
public class HomeController : Controller
{
    public ActionResult Index()
    {
        return View();
    }

    [HttpPost, ActionName("Index")]
    public ActionResult JustAnotherAction(int id)
    {
        ViewBag.Msg = "Message from JustAnotherAction";
        return View();
    }

    [HttpPost, ActionName("Index")]
    public ActionResult YetAnotherAction(int id)
    {
        ViewBag.Msg = "Message from YetAnotherAction";
        return View();
    }
}
{% endhighlight %}

Now I want my form to be posted to `JustAnotherAction` when `Option1` is selected in the view and to `YetAnotherAction` when `Option2` is selected.

So for this lets make the Custom `ActionMethodSelector`
{% highlight csharp %}
public class CustomActionMethodSelectorAttribute:ActionMethodSelectorAttribute
{
    private string _name;

    public CustomActionMethodSelectorAttribute(string name)
    {
        this._name = name;
    }

    public override bool IsValidForRequest(
        ControllerContext controllerContext, MethodInfo methodInfo)
    {
        string name = controllerContext.HttpContext.Request.Form["selector"];
        return name != null && this._name != null &&
            name.Equals(this._name,
                StringComparison.InvariantCultureIgnoreCase);
    }
}
{% endhighlight %}

It is very simplistic in nature. It looks for a form entry named selector, compare the value and if found a match it returns true, which means the action method on which it is applied will be selected as a potential candidate for the request.

Now apply this attribute on top of the two action methods and you are good to go.
{% highlight csharp %}
public class HomeController : Controller
{
    public ActionResult Index()
    {
        return View();
    }

    [HttpPost, ActionName("Index"), CustomActionMethodSelector("action1")]
    public ActionResult JustAnotherAction(int id)
    {
        ViewBag.Msg = "Message from JustAnotherAction";
        return View();
    }

    [HttpPost, ActionName("Index"), CustomActionMethodSelector("action2")]
    public ActionResult YetAnotherAction(int id)
    {
        ViewBag.Msg = "Message from YetAnotherAction";
        return View();
    }
}
{% endhighlight %}

Run the application and check for yourself.

Hope this helps.

**Disclaimer:** This post is moved as is (with minor formatting change) from my [old blog](http://programersnotebook.blogspot.de/2014/02/aspnet-mvc-actionnameselector-and_2.html).
