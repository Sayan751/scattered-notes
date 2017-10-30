---
layout: post
title:  "Extending Enterprise Library (EntLib) Validation Application Block (VAB) - Introduction"
date:   2014-03-17 17:10:00+0530
categories: dotnet
postid: "entlib_vab_part0"
tags: [.net, enterprise library, validation application block, validation]
---

## Why EntLib VAB? ##

Those who have worked with ASP.NET MVC know how easily one can implement the model validation using Data Annotation. On top of that, jQuery unobtrusive validation support makes it more enjoyable.

However, for a complex requirement you may want to change the validation specification based on some condition. For example, let us assume that you are working on a multi-tenant application where for same UI screen each tenant requires a different set of validation specifications. Say the end users in U.S. expecting date field to be in `mm/dd/yyyy` format, but for same field end users in India expecting `dd/mm/yyyy` format. Now this is really a simple change of regular expression for the date property in the model. However as the Validation Data Annotations are actually [attributes](http://msdn.microsoft.com/en-us/library/z0w1kczw.aspx), you cannot change the actual regular expression at run time.

Therefore, the most simplistic solution could be to make different models per tenant having just a different set of validation specification. Nevertheless, if you do that, the application will not be multi-tenant in its true sense, not to mention the other associated downside of it like maintaining a large library of models per tenant, making different views, controllers, areas and so on.

Next thing you can do is to make complex Custom Validation Attribute as shown [here]({{ site.baseurl }}{% post_url 2013-03-24-customizing_validation_attributes_in_mvc %}) just to make the validation specifications dynamic (or tenant specific per say).

So to mitigate the issue and to have a lot cleaner and manageable solution, Enterprise Library Validation Application Block can be utilized. Using EntLib Configuration Application Block Console (CABC), you can create tenant specific validation configuration on your Model and inject appropriate validation configuration at runtime. EntLib VAB comes with a set of useful validators like Not Null Validator (Required in MVC), Regular Expression Validator, String Length Validator, Property Compare Validator and so on. It also gives a facility to the developers so that they can design and develop their own validators and integrate the same with EntLib CABC.

So in a way it’s awesome… well almost.

## A small glitch ##

The downside of using EntLib VAB is that it does not provide client side validation Out-of-the-Box (OOTB) unlike MVC Validation Attributes. EntLib VAB is designed for providing server side validation by default. So in the beginning this limitation of EntLib may seem frustrating (especially so if you have worked with MVC Validation Attributes). However, the good news is that we can provide client side support for EntLib VAB with a very little effort.

## Well... another small glitch ##

The usual practice to do server side validation using EntLib VAB, is to instantiate validator and to use the validator to validate the target object. A sample code snippet can be this:

{% highlight csharp%}
public static ValidationResults Validate(object objectToValidate)
{
    FileConfigurationSource fileConfigurationsource = 
        new FileConfigurationSource(validationFilePath);
    Validator validator = ValidationFactory.CreateValidator(
        objectToValidate.GetType(),
        objectToValidate.GetType().Name,
        fileConfigurationsource);

    var validationResult = validator.Validate(objectToValidate);
    return validationResult;
}
{% endhighlight %}

This approach works fine for simple class object. However while validating an object graph, if any validation fails the keys returned in `ValidationResults` are not aligned with the MVC ModelState keys (i.e. keys in `ValidationResults` is different than the keys in `ModelState`) and hence the corresponding error messages are shown in the [Validation Summary](http://msdn.microsoft.com/en-us/library/ee839469%28v=vs.118%29.aspx) instead of span defined for showing error messages for respective Ux Model properties (by using [`ValidationMessageFor`](http://msdn.microsoft.com/en-us/library/system.web.mvc.html.validationextensions.validationmessagefor%28v=vs.118%29.aspx)).

### Scope ###

In this series, I am going to discuss on:

1. Enable client side support EntLib VAB and align the validation result keys with MVC ModelState keys
2. Create custom validators and integrate that with EntLib CABC.

### Prerequisite ###

If you are not familiar with Enterprise Library please go through these resources first:

- [Enterprise Library Developer's Guide](http://www.microsoft.com/en-in/download/details.aspx?id=41145)
- [Hands-On Lab on Enterprise Library](http://www.microsoft.com/en-in/download/details.aspx?id=40286)

Hope this helps.

Next posts on these series:
- [Extending EntLib VAB - Part 1: Enable client side support EntLib VAB and align the validation error keys with MVC ModelState keys]({{ site.baseurl }}{% post_url 2014-03-17-entlib_vab_part1 %})
- [Extending EntLib VAB - Part 2.1: Create custom validators and integrate that with EntLib CABC]({{ site.baseurl }}{% post_url 2014-03-17-entlib_vab_part2 %})
- [Extending EntLib VAB - Part 2.2: Enable unobtrusive jQuery validation for Custom Validator]({{ site.baseurl }}{% post_url 2014-03-17-entlib_vab_part3 %})

**Disclaimer:** This post is moved as is (with minor formatting change) from my [old blog](http://programersnotebook.blogspot.de/2014/03/extending-enterprise-library-entlib.html).
