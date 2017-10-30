---
layout: post
title:  "Extending EntLib VAB - Part 2.2: Enable unobtrusive jQuery validation for Custom Validator"
date:   2014-04-27 18:18:00+0530
categories: dotnet
postid: "entlib_vab_part3"
tags: [.net, asp.net mvc, enterprise library, validation application block, custom validator, jquery unobtrusive validation, validation, configuration application block console]
---

... Continuation from [Extending EntLib VAB - Part 2.1: Create custom validators and integrate that with EntLib CABC]({{ site.baseurl }}{% post_url 2014-03-17-entlib_vab_part2 %}).

Now lets see how we can enable client side unobtrusive validation for this custom validator by creating adapter for the same, adding the adapter in our custom implementation of `DataAnnotationsModelValidatorProvider` (explained in [Extending EntLib VAB - Part 1: Enable client side support EntLib VAB and align the validation error keys with MVC ModelState keys]({{ site.baseurl }}{% post_url 2014-03-17-entlib_vab_part1 %})), and finally writing unobtrusive jQuery validation.

## Step 1 ##

Create custom Adapter for our custom validator.

{% highlight csharp %}
public class NumberOnlyAttributeAdapter : 
    DataAnnotationsModelValidator<NumberOnlyAttribute>
{
    private readonly string _key;
    public NumberOnlyAttributeAdapter(
        ModelMetadata metadata,
        ControllerContext context,
        NumberOnlyAttribute attribute) : base(metadata, context, attribute)
    {
        _key = metadata.PropertyName;
    }

    public override IEnumerable<ModelClientValidationRule>
        GetClientValidationRules()
    {
        ModelClientValidationRule rule = new ModelClientValidationRule
            {
                ErrorMessage = String.Format(
                    CultureInfo.CurrentCulture,
                    this.Attribute.MessageTemplate, _key),

                /* make sure you add value of validation type and
                 * validation parameter name in lower case,
                 * otherwise it will result in runtime error.
                 */
                ValidationType = "numberonly"
            };
        yield return rule;
    }
}
{% endhighlight %}

## Step 2 ##

Integrate this adapter with our custom implementation of `DataAnnotationsModelValidatorProvider`. The code snippet is shown below:

{% highlight csharp %}
public class EntLibDataAnotationProvider :
    DataAnnotationsModelValidatorProvider
{
    // Fields
    private static Dictionary<Type, DataAnnotationsModelValidationFactory> 
        AttributeFactories = new Dictionary<Type, DataAnnotationsModelValidationFactory>
        {
            /*Rest of the code has been removed for brevity*/
            {
                typeof(NumberOnlyAttribute),
                (metadata, context, attribute) =>
                    new NumberOnlyAttributeAdapter(
                        metadata, context, (NumberOnlyAttribute)attribute)
            }
        };

    /*
    Implementation of the following methods has been omitted for Brevity
    (and also for the reason that there is no change in these functions):

    protected override IEnumerable<ModelValidator> GetValidators(
        ModelMetadata metadata,
        ControllerContext context,
        IEnumerable<Attribute> attributes)

    private IEnumerable<ModelValidator> GetValidators(
        ModelMetadata metadata,
        ControllerContext context,
        IEnumerable<ValidatorData> validatorData)
    */

    // Private Methods
    private ModelValidator GetValidator(
        ModelMetadata metadata,
        ControllerContext context,
        ValidatorData item)
    {
        DataAnnotationsModelValidationFactory factory;
        /*Rest of the code has been removed for brevity*/
        else if (item.GetType().Name == "NumberOnlyValidatorData")
        {
            /*  We have not really used the NumberOnlyValidatorData here,
             *  but the same can be used to retrieve any property related
             *  to NumberOnlyValidator as set in the config xml.
             *  Accordingly the properties can be used to
             *  instantiate the custom validation attribute.
             */
            NumberOnlyValidatorData numberOnlyData =
                (NumberOnlyValidatorData)item;

            NumberOnlyAttribute numOnlyAttribute = 
                new NumberOnlyAttribute 
                {
                    MessageTemplate = item.GetMessageTemplate()
                };

            if (AttributeFactories
                    .TryGetValue(numOnlyAttribute.GetType(), out factory))
                return factory(metadata, context, numOnlyAttribute);
        }
        return null;
    }
}
{% endhighlight %}

Once you have done this far, the `data-val-X` attributes will be rendered for the properties (of your UxModel) on which you have applied this custom validator. For example:

{% highlight html %}
<input data-val="true" data-val-numberonly="Only Integer Input Allowed" 
        data-val-required="Another Name is required."
        id="AnotherProp_AnotherName"
        name="AnotherProp.AnotherName" type="text" value="" />
{% endhighlight %}

We are almost done. As these `data-val-X` attributes are rendered for the properties only thing left is to write jQuery unobtrusive validation and refer the same in your view.

## Step 3 ##

Writing unobtrusive jQuery validation:

{% highlight javascript %}
$.validator.addMethod('numberonly', 
    function (value, element, params) {
        /* Yes, I agree there is a mismatch in
        * client side and server side validation here,
        * but this is just to give you the idea.
        */
        var regex = new RegExp('^\\d*$');
        return regex.test(value);
    });

$.validator.unobtrusive.adapters.add('numberonly', [], 
    function (options) {
        options.rules['numberonly'] = true;
        options.messages['numberonly'] = options.message;
    });
{% endhighlight %}

## Step 4 ##

Refer this script in view or add it to appropriate bundle:

{% highlight javascript %}
bundles.Add(new ScriptBundle("~/bundles/jqueryval")
        .Include(
            "~/Scripts/jquery.unobtrusive*",
            "~/Scripts/jquery.validate*",
            "~/Content/CustomScripts/UnobtrusiveValidators/NumberOnlyValidator.js"));
{% endhighlight %}

And that's it… And You are ready to Rock N' Roll.

Hope this helps.

P.S: This is written based on my personal experience, if there is a better way to do it, please don't hesitate to leave your comments.

**Disclaimer:** This post is moved as is (with minor formatting change) from my [old blog](programersnotebook.blogspot.com/2014/04/extending-entlib-vab-part-22-enable.html).
