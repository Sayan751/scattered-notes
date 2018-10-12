---
layout: post
title:  "Filter an object array using delegates, without using LINQ"
date:   2013-08-04 18:30:00+0530
categories: dotnet
postid: "filter_an_object_array_using_delegates_without_using_linq"
tags: [.net, delegate, filter using delegate]
---
**Disclaimer:** This post is moved as is (with minor formatting change) from my [old blog](http://programersnotebook.blogspot.de/2013/08/net-interview-question-filter-object.html).

## Variant 1: Filtering a .net simple type array using delegate ##

Using delegate to filter an array of integers. Delegate takes two arguments, one is the value from the array and the second one is the number, the array member with value greater than this number will be returned (filtered).
Declaration:

{% highlight csharp %}
public static class Common
{
    public delegate bool IntFilter(int value, int number);
    public static int[] FilterArrayOfInts(int[] ints, IntFilter filter)
    {
        ArrayList aList = new ArrayList();
        foreach (int i in ints)
            if (filter(i, 30))
                aList.Add(i);
        return (int[])aList.ToArray(typeof(int));
    }
}

public class Filters
{
    public static bool GreaterThanNumber(int value, int number)
    {
        return value >= number;
    }
}
{% endhighlight %}

Invocation:

{% highlight csharp %}
int[] targetArray = { 10, 20, 30, 60, 50, 25 };
int[] filteredArray = Common.FilterArrayOfInts(targetArray, Filters.GreaterThanNumber);
Console.WriteLine("====Filtered Array====");
foreach (int num in filteredArray)
    Console.WriteLine(num);
{% endhighlight %}

Output:

![output1](https://i.postimg.cc/kgrL7vBr/1-1.png)

## Variant 2: Filtering a complex type array using delegate ##

Filtering an array of Target class on Age property.
Declaration:

{% highlight csharp %}
public static class Common
{
    public delegate bool ObjectFilter<TEntity>(TEntity obj,
        string property, int number) where TEntity : class;

    public static TEntity[] FilterObjectArray<TEntity>(
        TEntity[] objs, string property, ObjectFilter<TEntity> filter)
        where TEntity : class
    {
        List<TEntity> list = new List<TEntity>();

        foreach (TEntity obj in objs)
            if (filter(obj, property, 30))
                list.Add(obj);

        return list.ToArray();
    }
}

public class Filters
{
    public static bool ObjGreaterThanNumber<TEntity>(TEntity obj,
        string property, int number) where TEntity : class
    {
        return Convert.ToInt32(
            obj.GetType()
                .GetProperty(property)
                .GetValue(obj)) > number;
    }
}
{% endhighlight %}

Target Class:

{% highlight csharp %}
public class TargetClass
{
    public string Name { get; set; }
    public int Age { get; set; }
}
{% endhighlight %}

Invocation:

{% highlight csharp %}
TargetClass[] objs = new TargetClass[] {
                new TargetClass{Name="Holmes",Age=60},
                new TargetClass{Name="David",Age=40},
                new TargetClass{Name="Dorian",Age=20}
            };

Console.WriteLine("====Filtered Objects====");
foreach (TargetClass tobj in 
        Common.FilterObjectArray(objs, "Age", Filters.ObjGreaterThanNumber))
    Console.WriteLine("Name: " + tobj.Name + " | Age: " + tobj.Age);
{% endhighlight %}

Output:

![Output2](https://i.postimg.cc/FHj8zkLY/2-1.png)
           
## Variant 3: Filtering a complex type array using Func expression ##

Filter an array of Target class(refer previous example in Variant 2 for Target Class definition and objs array) using Func expression.
Declaration:

{% highlight csharp %}
public static class Common
{
    public static TEntity[] FilterObjectArrayUsingFuncExpression<TEntity>(
        TEntity[] objs, Func<TEntity,bool> func) where TEntity : class
    {
        List<TEntity> list = new List<TEntity>();

        foreach (TEntity obj in objs)
            if (func(obj))
                 list.Add(obj);

         return list.ToArray();
     }
}
{% endhighlight %}

Invocation:
{% highlight csharp %}
Console.WriteLine("====Filtered Objects using Func expression====");

foreach (TargetClass tobj in 
        Common.FilterObjectArrayUsingFuncExpression(objs, 
            tc => tc.Name.Contains("i")))
    Console.WriteLine("Name: " + tobj.Name + " | Age: " + tobj.Age);
{% endhighlight %}

Output:

![output3](https://i.postimg.cc/sX00qptN/3-1.png)

## Variant 4: Filtering a complex type array without any loop (Using System.Array class) ##

Filter an object array of Target class using a delegate and System.Array class. 
Declaration:

{% highlight csharp %}
public static class Common
{
    public delegate bool AgeFilter<TEntity>(TEntity obj) where TEntity : class;

    public static TEntity[] FilterObjectsUsingArrayClass<TEntity>(
        TEntity[] objArray, AgeFilter<TEntity> filter) where TEntity : class
    {
        return Array.FindAll(objArray, new Predicate<TEntity>(filter));
    }
}

public class Filters
{
    public static bool AgeGreaterThan30<TEntity>(
        TEntity obj) where TEntity : class
    {
        return Convert.ToInt32(
            obj.GetType()
                .GetProperty("Age")
                .GetValue(obj)) > 30;
    }
}
{% endhighlight %}

Invocation:
{% highlight csharp %}
Console.WriteLine("====Filtered Objects using Array Class====");

foreach (TargetClass tobj in 
    Common.FilterObjectsUsingArrayClass(objs, Filters.AgeGreaterThan30))
    Console.WriteLine("Name: " + tobj.Name + " | Age: " + tobj.Age);
{% endhighlight %}

Output:

![output4](https://i.postimg.cc/j2wkbDTd/4-1.png)

As always, don’t hesitate to correct me.

Hope this helps.