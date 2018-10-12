---
layout: post
title:  "Customizing Validation Attributes in MVC"
date:   2013-03-24 14:11:00+0530
categories: asp.net
postid: "customizing_validation_attributes_in_mvc"
tags: [.net, attribute, asp.net mvc, validation]
---
**Disclaimer:** This is an old post, moved as is (with minor formatting change) from my [old blog](http://programersnotebook.blogspot.de/2013/03/customizing-validation-attributes-in-mvc.html).

## Background ##

As many of you already know, MVC provides validation attribute functionality to validate view models. A few very commonly used validation attributes are: `Required`, `RegularExpression` and `Range`. Below is one simple example:

{% highlight csharp %}
public class Person
{
    [Required(ErrorMessage = "Please Enter your name")]
    public string Name { get; set; }

    [Required(ErrorMessage = "Please Enter your Email")]
    [RegularExpression(".+\\@.+\\‥+", ErrorMessage = "Please Enter valid Email")]
    public string Email { get; set; }

    [Required(ErrorMessage = "Please Enter your Phone")]
    public string Phone { get; set; }
}
{% endhighlight %}

Which will give you the following output:

![validation](https://i.postimg.cc/9MXvvXzr/Img1-1.jpg)

This default behavior is good for less complex application, where you can apply factory made validation without any considerable effort from your side.

You can also enable client side validation (validation will be done at client side without server post back) by adding/modifying the following lines in the

- `Web.config` file:
{% highlight xml %}
<configuration>
<appSettings>
    <add key="ClientValidationEnabled" value="true" />
    <add key="UnobtrusiveJavaScriptEnabled" value="true" />
</appSettings>
</configuration>
{% endhighlight %}

- Layout / View page (of course you can use the latest version of jQuery):
    {% highlight html %}
    <script src="~/Scripts/jquery-1.9.1.min.js"></script>
    <script src="~/Scripts/jquery.validate.min.js"></script>
    <script src="~/Scripts/jquery.validate.unobtrusive.min.js"></script>
    {% endhighlight %}

### So far so good, Now lets complicate it ###

Lets assume that this application is going to be used by people from different regions and every region has a specific format for phone number. Every region has a separate set of special characters to be allowed for the phone number.

For this you need to change the regular expression of the `RegularExpression` attribute for the phone number property on runtime. Now by design you can’t modify the attribute property value on runtime.
For example I've the below view model. Now I want to change the regular expression of `RegularExpresssionAttribute` or the max range of `RangeAttribute`, only for one instance of my `ViewModel` class, inside my controller action and pass the model instance to view so that the view is rendered with new validation attributes.

{% highlight csharp %}
public class ViewModel
{
    [RegularExpression(@"\d")]
    public string REField { get; set; }

    [Range(0,5)]
    public int RangeField { get; set; }
}
{% endhighlight %}

I can't assign the attribute explicitly at runtime as Attribute is read only.

{% highlight csharp %}
public ActionResult Index()
{
    ViewModel prod = new ViewModel();
    if(SomeCondition)
    {
        TypeDescriptor
            .GetProperties(prod)["REField"]
            .Attributes[typeof(RangeAttribute)] = new RangeAttribute(0, 100);
    }
    return View(prod);
}
{% endhighlight %}

If tried above it’ll give compilation error:
> Property or indexer `System.ComponentModel.AttributeCollection.this[System.Type]` cannot be assigned to -- it is read only.

If you’ve worked in ASP.NET form based application, you’ll understand the pain, where this same is possible by setting a few properties of different validator controls.

## So how to tame this behavior? ##

It’s a good thing that MVC also allows you to build your own custom validation attribute, where you can manufacture validation attribute depending upon your need.
Making your _own custom validation attribute_ is a two step process.

1. **Server side validation:** you need to inherit `ValidationAttribute`(namespace:  `System.ComponentModel.DataAnnotations`) abstract class.
1. **Client side validation:** you need to implement `IClientValidatable`(namespace: `System.Web.Mvc`) interface.

In this example we’ll look for other property for the validation criteria for the target property of the target model class.

We’ll go step by step.

First create a MVC 4 Web Application project using basic template. I’ve named it `MVCCustomValidation`.

Next create a class in Models folder name `TargetModel.cs`

{% highlight csharp %}
namespace MVCCustomValidation.Models
{
    public class TargetModel
    {
        //Target property for which validation needs to be done.
        [Required(ErrorMessage="Mandatory Field")]
        public string TargetProp { get; set; }

        //Property that provides regular expression for the target property
        [HiddenInput(DisplayValue=false)]
        public string REForTargetProp { get; set; }
    }
}
{% endhighlight %}

Next add a new folder called `Infra` in the root directory of our `MVCCustomValidation` project by right clicking project and then selecting Add—>New Folder.

Inside this new folder add a class called `REAttribute.cs` and modify the content as below:

{% highlight csharp %}
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Web.Mvc;
using System.Text.RegularExpressions;

namespace MVCCustomValidation.Infra
{
    [AttributeUsage(AttributeTargets.Property)]
    public sealed class REAttribute : ValidationAttribute
    {
        public REAttribute(string pREProviderProperty)
        {
            REProviderProperty = pREProviderProperty;
        }

        public string REProviderProperty { get; private set; }

        protected override ValidationResult IsValid(
            object value, ValidationContext validationContext)
        {
            string _regularExp = validationContext
                                .ObjectType
                                .GetProperty(REProviderProperty)
                                .GetValue(validationContext.ObjectInstance)
                                .ToString();

            if ((value != null) &&
                (!Regex.Match((string)value, _regularExp).Success))
                return new ValidationResult(ErrorMessage);

            return ValidationResult.Success;
        }
    }
}
{% endhighlight %}

We’ve created a sealed attribute class `REAttribute` which inherits `ValidationAttribute` class. Constructor for this validation attribute class takes only one parameter which is the name of the property that provides regular expression for the target property(`REForTargetProp` in our case).

We created our own overridden version of `IsValid()` method. This method is called to check whether the value of the target property is valid or not. This method takes two parameters:

1. `value` is the value to be validated, i.e. the value of the target property, and
1. `ValidationContext` object which contains information about the validation request.

We’ve used the `ValidationContext` object to extract the value of regular expression provider property. We’ve used regex pattern matching to validate the `value` against the regular expression extracted and returned validation result accordingly.

Now the server side validation setup is done. We need to apply this attribute in our `TargetModel` class.

{% highlight csharp %}
public class TargetModel
{
    [RE("REForTargetProp",
        ErrorMessage="Value should be numeric")]//Custom attribute added
    [Required(ErrorMessage="Mandatory Field")]
    public string TargetProp { get; set; }

    [HiddenInput(DisplayValue=false)]
    public string REForTargetProp { get; set; }
}
{% endhighlight %}

Now create a controller named `HomeController` and modify the content as below:

{% highlight csharp %}
namespace MVCCustomValidation.Controllers
{
    public class HomeController : Controller
    {
        public ActionResult Index()
        {
            return View(new TargetModel { REForTargetProp = @"\d"});
        }

        [HttpPost]
        public ActionResult Index(TargetModel model)
        {
            if (!ModelState.IsValid)
                return View(model);
            else
                return View("Success",model);
        }

    }
}
{% endhighlight %}

The controller code is pretty simple. The first `Index` method calls a view with blank instance of `TargetModel` object only passing the regular expression. The second `Index` method (one with `HttpPost` selector) validates the model data on postback. If it is not valid, same view page is returned to the user or else user is redirected to `Success` page.

Note that we’ve passed regular expression to validate numeric digits.

In order to create view, right click any method name in the controller and select `Add View` option. Create two strongly typed views named `Index.cshtml` and `Success.cshtml`. While creating the views also select the option to use layout or master page.

![Add Index View](https://i.postimg.cc/LXyrRdZv/Img2-1.jpg){: style="width: 45%"}
![Add Success View](https://i.postimg.cc/8cjxzyRG/Img3-1.jpg){: style="width: 45%"}

Make sure the content of the `Index.cshtml` and `Sucess.cshtml` matches the below content:

- Index.cshtml:

{% highlight csharp %}
@model MVCCustomValidation.Models.TargetModel
 
@{
    ViewBag.Title = "Index";
}
<h2>Index</h2>
 
@using (Html.BeginForm())
{
    @Html.ValidationSummary(false)

    @Html.EditorForModel()

    <input type="submit" value="Submit" />
}
{% endhighlight %}

- Success.cshtml:

{% highlight csharp %}
@model MVCCustomValidation.Models.TargetModel

@{
    ViewBag.Title = "Success";
}

<h2>Validation Successful!!</h2>
<h3>Target Value: @Model.TargetProp</h3>
<h3>Regular Expr: @Model.REForTargetProp</h3>
{% endhighlight %}

Now run the application. You can test the custom validation attribute by entering invalid values:

![validation](https://i.postimg.cc/C5XXBj7q/Img4-1.jpg)

If you notice, the page is making a post back to check the values. Because we’ve not yet applied client side validation.

Applying client side validation is a two step process,

1. As told earlier you need to implement `IClientValidatable` interface in your custom validation attribute.
1. You need to write your own client side script.

Implementing `IClientValidatable` interface:

{% highlight csharp %}
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Web.Mvc;
using System.Text.RegularExpressions;

namespace MVCCustomValidation.Infra
{
    [AttributeUsage(AttributeTargets.Property)]
    public sealed class REAttribute : ValidationAttribute, IClientValidatable
    {
        public REAttribute(string pREProviderProperty)
        {
            REProviderProperty = pREProviderProperty;
        }

        public string REProviderProperty { get; private set; }

        protected override ValidationResult IsValid(object value,
            ValidationContext validationContext)
        {
            string _regularExp = validationContext
                                    .ObjectType
                                    .GetProperty(REProviderProperty)
                                    .GetValue(validationContext.ObjectInstance)
                                    .ToString();

            if ((value != null) && 
                (!Regex.Match((string)value, _regularExp).Success))
                return new ValidationResult(ErrorMessage);

            return ValidationResult.Success;
        }

        public IEnumerable<ModelClientValidationRule> GetClientValidationRules(
            ModelMetadata metadata, ControllerContext context)
        {
            var rule = new ModelClientValidationRule
            {
                ErrorMessage = this.ErrorMessage,

                // make sure this is in lower case.
                ValidationType = "reattribute"
            };

            // make sure parameter name is in lower case.
            rule.ValidationParameters.Add("reproviderproperty",
                                        REProviderProperty);
            yield return rule;
        }
    }
}
{% endhighlight %}

The newly added code is marked in bold. By implementing `GetClientValidationRules` method we’re providing support for client validation. This method returns `ModelClientValidationRule` objects which is used by framework to output HTML 5 `data-xxx` attributes for the target property, which are to be used to perform client side validation. Hence we must pass all the necessary attributes to client side which are required for client side validation.

If you run the application now you can see these `data-xxx` attributes added in the HTML response sent to the browser.

{% highlight html %}
<form action="/" method="post">
    <div class="validation-summary-valid" data-valmsg-summary="true">
        <ul>
            <li style="display: none"></li>
        </ul>
    </div>
    <div class="editor-label">
        <label for="TargetProp">TargetProp</label>
    </div>
    <div class="editor-field">
        <input class="text-box single-line" data-val="true"
               data-val-reattribute="Value should be numeric"
               data-val-reattribute-reproviderproperty="REForTargetProp"
               data-val-required="Mandatory Field"
               id="TargetProp" name="TargetProp"
               type="text" value="" />
        <span class="field-validation-valid"
               data-valmsg-for="TargetProp"
               data-valmsg-replace="true"></span>
    </div>
    <input id="REForTargetProp" name="REForTargetProp"
           type="hidden" value="\d" />
    <input type="submit" value="Submit" />
</form>
{% endhighlight %}

## Writing your own jQuery Script: ##

Now the next step is to set up your own Client Side script to use these metadata values and provide client side validation.

In the Scripts folder we’ve added a new folder called `CustomScripts` and inside this folder we’ve added a new javascript file called `REScript.js`. Modify the content so that it matches below code:

{% highlight javascript %}
$.validator.unobtrusive.adapters.add("reattribute", ["reproviderproperty"],
function (options) {

    options.rules['reattribute'] =
    {
        reproviderproperty: options.params.reproviderproperty
    };

    options.messages['reattribute'] = options.message;
});

$.validator.addMethod("reattribute", function (value, element, params) {

    if (params.reproviderproperty) {
        var re = $('#' + params['reproviderproperty']).val()
        var regex = new RegExp(re)
        return regex.test(value);
    }

    return false;
});
{% endhighlight %}

In the first step we’re adding an validation adapter:

{% highlight javascript %}
$.validator.unobtrusive.adapters.add(adaptername,[params],function)
{% endhighlight %}

- `adaptername` must match the `ValidationType` value that is passed from server side code, i.e. it must match `XXX` part of `data-val-XXX` where `XXX` is the name of the validation type.
- params is the paramters passed from server side and rendered as HTML 5 attribute: `data-val-XXX-NNN` where `XXX` is the name of the validation type and `NNN` is the name of the parameters.
- function is called to convert HTML 5 data attributes to jQuery equivalent parameters, so that jQuery validate function can use those.

You can get a more detailed description on adapters in [Unobtrusive Client Validation in ASP.NET MVC 3 by Brad Wilson](http://bradwilson.typepad.com/blog/2010/10/mvc3-unobtrusive-validation.html).

Now the second step is where you write your actual jQuery method by using `$.validator.addMethod()`. Here we’re extracting the regular expression using the parameter passed(here `reproviderproperty`) and testing the value passed against this regular expression. This is fairly simple.

You need to include this custom script of your own in the view page and also need to include jQuery libraries in the layout page.

`_Layout.cshtml`

{% highlight html%}
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>@ViewBag.Title</title>
    @Styles.Render("~/Content/css")
    <!-- additional scripts below -->
    <script src="~/Scripts/jquery-1.9.1.min.js"></script>
    <script src="~/Scripts/jquery.validate.min.js"></script>
    <script src="~/Scripts/jquery.validate.unobtrusive.min.js"></script>
</head>
<body>

    @RenderBody()

    @RenderSection("scripts", required: false)
</body>
</html>
{% endhighlight %}

`Index.cshtml`

{% highlight html%}

@model MVCCustomValidation.Models.TargetModel

@{
    ViewBag.Title = "Index";
}
<h2>Index</h2>

<script src="~/Scripts/CustomScripts/REScript.js"></script>
@using (Html.BeginForm())
{
    @Html.ValidationSummary(false)
    
    @Html.EditorForModel()
    
    <input type="submit" value="Submit" />
}
{% endhighlight %}

The last step is to check whether your web.config has the below settings or not:

{% highlight xml%}
<configuration>
    <appSettings>
        <add key="ClientValidationEnabled" value="true" />
        <add key="UnobtrusiveJavaScriptEnabled" value="true" />
    </appSettings>
</configuration>
{% endhighlight %}

And you are ready to go. Test your application in browser, enter a non-numeric value in the text box and just move the focus from it without clicking the submit button and see the result.

![Validation](https://i.postimg.cc/L4brbpS8/Img5-1.jpg)

You can also get the full code from [here](https://docs.google.com/file/d/0B4Wl0CqfSBnkVUdiNFVjTUpINjQ/edit?usp=sharing).

Note: This post is entirely based on my personal RND. If anyone finds something wrong in the code shared or a better approach to achieve the same result, kindly don’t hesitate to share. :smile:

Hope this helps.