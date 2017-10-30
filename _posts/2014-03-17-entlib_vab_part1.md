---
layout: post
title:  "Extending EntLib VAB - Part 1: Enable client side support EntLib VAB and align the validation error keys with MVC ModelState keys"
date:   2014-03-17 21:49:00+0530
categories: dotnet
postid: "entlib_vab_part1"
tags: [.net, enterprise library, validation application block, validation, mvc]
---

As discussed in my [last post]({{ site.baseurl }}{% post_url 2014-03-17-entlib_vab_part0 %}) EntLib VAB doesn't support client side validation (in js/jQuery) out-of-the-box. And also while validating object graph, EntLib VAB generate Validation Result keys which are different from the `ModelState` keys in MVC.

In this post we will discuss on this problem.

Solution to this problem is simple. We just need to create an adapter for EntLib VAB validator to MVC `ValidationAttribute`, i.e. a piece of code is needed that will read the EntLib Validation configuration xml and for each validator it will return the MVC counterpart of the validator, i.e. `ValidationAttribute`.

As for aligning the validation error keys with MVC `ModelState` keys, we need to leverage the default model validation of ASP.NET MVC.

And the great news is that one single piece of code addresses combines these two solutions.

## So what is the story behind the scene? ##

Check the below process flow:

1. On receiving request from client, default MVC Model Binder tries to bind model from various value providers. After the model binding is done, it raises Model Updated event.
1. Model Updated event handler in turn calls` ModelValidator.GetModelValidator().Validate()` method.
1. Inside `Validate()` method, `ModelMetaData.GetValidators()` is invoked which in turn invokes `ModelValidatorProviders.Providers.GetValidators()`. 
1. `ModelValidatorProviders` holds a collection of three built-in validators `[DataAnnotationsModelValidatorProvider(), DataErrorInfoModelValidatorProvider(), and ClientDataTypeModelValidatorProvider()]`, out of which `DataAnnotationsModelValidatorProvider` is our guy. It is this class, which provides default model validation for MVC.

So long story short, all we have to do is to override `DataAnnotationsModelValidatorProvider` class, which will hold our adapter logic inside it and after that to register our own Validator Provider to `ModelValidatorProviders.Providers`.

If we do this far, we have fairly done the job of addressing the two issues as said above: enabling client side validation and getting appropriate validation error keys (Keys are taken care of at the time of model binding process itself. Hence as we are just hooking in our custom implementation in the default processing of model binding, we don't need to do anything additional on top of this.). Note that in this process, we also do not need to make explicit call to the `Validator.Validate()` method which people usually do with EntLib VAB to make server side validation as the `DefaultModelBinder` does that by invoking all the registered Validator Providers.

Cool Right?

Ok enough of theory… Lets see some code now, because a piece of code says a lot more than thousand words... :wink:

**Disclaimer:** I personally like to create the validation config xml file in a separate file other than `web.config`/`app.config` as I find the same to be a lot more cleaner approach. Hence all the code example shown below consider the same. If you are more comfortable working with defining the same in `app.config`/`web.config`, you can also do that.

So first we are creating our own custom Data Annotation provider inheriting from `DataAnnotationsModelValidatorProvider` (remember the guy who provides default model validation for MVC). It has a method `GetValidators()` which we need to override. Inside this function we are invoking a custom extension function that reads the EntLib VAB configuration xml file and retrieve the defined validators for the model. And then the custom adapter functions are invoked that translate EntLib VAB validators to MVC Validation attributes.

Below code sample shows how to do the translation for two of EntLib VAB validators(`NotNullValidator` and `RegExValidator`), but that will be enough to give you the idea of how to do the translation for other validators as well. It also shows how to work with composite EntLib VAB validators, sample includes example for `OrCompositeValidator`. Being a composite validator, `OrCompositeValidator` holds a collection of other validators; the trick is to extract those validators and make recursive calls to the adapter methods so that those validators gets translated to MVC validation attributes.
The custom `ModelValidatorProvider`:
{% highlight csharp %}
namespace Validation
{
    public class EntLibDataAnotationProvider : DataAnnotationsModelValidatorProvider
    {
        // Fields
        private static Dictionary<Type, DataAnnotationsModelValidationFactory> AttributeFactories =
            new Dictionary<Type, DataAnnotationsModelValidationFactory>
            {
                {
                    typeof(RequiredAttribute),
                    (metadata, context, attribute) =>
                        new RequiredAttributeAdapter(
                            metadata, context, (RequiredAttribute)attribute)
                },
                {
                    typeof(RegularExpressionAttribute),
                    (metadata, context, attribute) =>
                        new RegularExpressionAttributeAdapter(
                            metadata, context, 
                            (RegularExpressionAttribute)attribute)
                }
            };

        protected override IEnumerable<ModelValidator> GetValidators(
            ModelMetadata metadata,
            ControllerContext context,
            IEnumerable<Attribute> attributes)
        {
            List<ModelValidator> validators = nw List<ModelValidator>();
            List<ValidatorData> validatorDataList = 
                metadata.ContainerType != null
                ? metadata.ContainerType.ExtractRules(metadata.PropertyName)
                : new List<ValidatorData>();
            return GetValidators(metadata, context, validatorDataList);
        }

        // Private Methods
        private IEnumerable<ModelValidator> GetValidators(
            ModelMetadata metadata,
            ControllerContext context,
            IEnumerable<ValidatorData> validatorData)
        {
            List<ModelValidator> validators = new List<ModelValidator>();
            foreach (var item in validatorData)
            {
                if (item.GetType().Name == "OrCompositeValidatorData")
                {
                    validators.AddRange(
                        GetValidators(metadata, context,
                        ((OrCompositeValidatorData)item)
                            .Validators
                            .Where(v => !((ValueValidatorData)v).Negated)));
                }
                else
                    validators.Add(GetValidator(metadata, context, item));
            }

            return validators.Where(item => item != null);
        }
        /// <summary>
        /// The mapper method that translates EntLib validator to 
        /// ASP.NET MVC Validation Attribute
        /// </summary>
        private ModelValidator GetValidator(
            ModelMetadata metadata,
            ControllerContext context,
            ValidatorData item)
        {
            DataAnnotationsModelValidationFactory factory;

            // So for a EntLib NotNullValidator what
            // we really need in MVC is a RequiredAttribute.
            if (item.GetType().Name == "NotNullValidatorData")
            {
                ValidationAttribute attribute =
                    new RequiredAttribute
                    {
                        ErrorMessage = item.MessageTemplate
                    };
                if (AttributeFactories
                    .TryGetValue(attribute.GetType(), out factory))
                    return factory(metadata, context, attribute);
            }
            // Likewise for a EntLib RegExValidator
            // we need RegularExpressionAttribute in MVC.
            else if (item.GetType().Name == "RegexValidatorData")
            {
                RegexValidatorData regexData = (RegexValidatorData)item;

                RegularExpressionAttribute regexAttribute = 
                    new RegularExpressionAttribute(regexData.Pattern)
                    {
                        ErrorMessage = item.GetMessageTemplate() 
                    };

                if (AttributeFactories
                    .TryGetValue(regexAttribute.GetType(), out factory))
                    return factory(metadata, context, regexAttribute);
            }

            return null;
        }
    }
}
{% endhighlight %}

The extension method to extract defined validation settings:

{% highlight csharp %}
public static List<ValidatorData> ExtractRules(
    this Type targetType, string propertyName)
{
    FileConfigurationSource fileConfigurationsource =
        new FileConfigurationSource(validationFilePath);
    ValidationSettings settings =
        (ValidationSettings)fileConfigurationsource.GetSection("validation");

    ValidatedTypeReference rules = 
                            settings.Types
                                    .FirstOrDefault(item =>
                                        item.Name
                                            .Equals(targetType.FullName));

    return rules
            .Rulesets
            .SelectMany(item => item.Properties)
            .Where(item => item.Name.Equals(propertyName))
            .SelectMany(item => item.Validators)
            .ToList();
}
{% endhighlight %}

Now the final step: register our custom `ModelValidatorProvider` to `ModelValidatorProviders.Providers` in `Application_Start()` in `Global.asax`:

{% highlight csharp %}
using Validation;

public class MvcApplication : System.Web.HttpApplication
{
    protected void Application_Start()
    {
        /*Usual code removed for the sake of Brevity*/

        ModelValidatorProviders
            .Providers
            .Add(new EntLibDataAnotationProvider());
    }
}
{% endhighlight %}

And now you are good to go. Try this on your own now.

Don't forget to add the jQuery unobtrusive validation libraries in the master layout (view). Also this is written based on my personal experience, if there is a better way to do it, please don't hesitate to leave your comments.

Hope this helps.

Next posts on these series:

- [Extending EntLib VAB - Part 2.1: Create custom validators and integrate that with EntLib CABC]({{ site.baseurl }}{% post_url 2014-03-17-entlib_vab_part2 %})
- [Extending EntLib VAB - Part 2.2: Enable unobtrusive jQuery validation for Custom Validator]({{ site.baseurl }}{% post_url 2014-03-17-entlib_vab_part3 %})

**Disclaimer:** This post is moved as is (with minor formatting change) from my [old blog](http://programersnotebook.blogspot.de/2014/03/extending-entlib-vab-part-1-enable.html).
