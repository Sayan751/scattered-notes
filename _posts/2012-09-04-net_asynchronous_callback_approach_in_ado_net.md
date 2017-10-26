---
layout: post
title:  ".NET: Asynchronous Callback Approach in ADO.NET"
date:   2012-09-04 19:39:00+0530
categories: sql
postid: "net_asynchronous_callback_approach_in_ado_net"
tags: [.net, ado.net, asynchronous, callback]
---
**Disclaimer:** This is a prehistoric post :smile:, moved as is (with minor formatting change) from my [old blog](http://programersnotebook.blogspot.de/2012/09/net-asynchronous-callback-approach-in_4.html).

I am studying [Professional ASP.NET 4 in C# and VB](http://www.wrox.com/WileyCDA/WroxTitle/Professional-ASP-NET-4-in-C-and-VB.productCd-0470502207.html) book from Wrox Publication. It is a great book with really easy-to-understand basic examples. As I'm a novice in ASP.NET/.NET Framework, it really helped me a lot in understanding the technology. Wrox also lets you download the codes used in the examples in the books. Anyone interested can download the same from this link: [Code for Professional ASP.NET 4 in C# and VB](http://www.wrox.com/WileyCDA/WroxTitle/Professional-ASP-NET-4-in-C-and-VB.productCd-0470502207,descCd-DOWNLOAD.html).

But sometimes, I found some mistakes in the examples, provided in the book. I tried the same code in my machine, but I was unable to produce the desired result. So  I'm going to discuss on a similar mistake I've found in the book recently and also going to discuss the workaround.

We're going to discuss on Asynchronous Callback Approach in ADO.NET. Before we jump straight  into the topic first let me explain what is Asynchronous Processing in ADO.NET.

## Introduction ##

In general, in ADO.NET, each command is executed sequentially, i.e. code waits for the previous command to be completed before it starts executing the next command.
Asynchronous approach lets you do the processing in a parallel manner. Using this approach two sql commands can be executed in parallel using the same connection.This comes real handy when you are dealing with multiple data sources, like you have two GridView controls in your page, one for displaying employee's personal details, another for displaying the employee's payment change history. Apart from processing the command executions in parallel it also lets you perform other tasks(those are not dependent on the output of command execution) without completing the command execution.

## Types of Asynchronous Processing ##

There are three approach for Asynchronous Processing:

1. **Poll:** Code starts the command execution asynchronously and keeps checking whether the execution is complete or not. If the execution is found incomplete the current thread is put to sleep. After the sleeping time span is over, it again checks for completion and so on.
2. **Wait:** Multiple asynchronous command execution can be started using this approach.Code can wait for any or all of the processes to complete.
3. **Callback:** Asynchronous command execution starts and a callback delegate is used. As soon as the command processing is complete the callback method is fired. Further processing can be done in the callback method.

We'll focus only on Callback approach in this article. Anyone interested to know in detail about the other approaches can buy a copy of  Professional ASP.NET 4 in C# and VB and read or else can Google it. :wink:

## Objective ##

Using Asynchronous Callback approach, we'll fetch some data from database and populate in the grid view in the page. For this example I'm going to use AdventureWorks database and SQL server 2008.

We're going to use HumanResources.Employee & HumanResources.EmployeePayHistory tables in this example. User will input NationalIDNumber from front end and code will fetch the employee details from database. You can download the necessary SQL script from [here](https://docs.google.com/open?id=0B4Wl0CqfSBnkZFppZUZSeVotdFU).

## Implementation as described in Wrox's book & the flaw ##

Most certainly I'm not going to write here the exact code given in the book as I made some changes in the code. But as I've said at the start of this post, anyone can download the code from given link, anyone interested can download it and check the last code example in chapter 8.

For this I've added one textbox control, one button control and one gridview control in my aspx page, which looks something like below:

Aspx page:
{% highlight html %}
<asp:Label ID="Label1" runat="server" Text="National ID Number:"></asp:Label>
&nbsp;&nbsp;&nbsp;
<asp:TextBox ID="TextBox1" runat="server"></asp:TextBox>&nbsp;
<asp:Button ID="Button1" runat="server" Text="Button" onclick="Button1_Click" />
<br /><br />
<asp:GridView ID="GridView1" runat="server">
</asp:GridView>  
{% endhighlight %}

The idea is to query the database with the National ID Number as entered by user and fetch the details on button click. For this `Button1_Click` function is used that will initiate the asynchronous command execution. As this needs to be done asynchronously, a method: `CBMethod` needs to be created which will be fired on the event of command execution completion and do the further processing. Code shown in Wrox's book looks somewhat like below: Note that you need to add `Asynchronous Processing=true` to the connection string to open asynchronous connection to the database.

Code behind:
{% highlight csharp %}
IAsyncResult _empAsyncResult;

protected void Button1_Click(object sender, EventArgs e)
{
    SqlConnection _con;
    SqlCommand _cmdEmp;

    try
    {
        _con = new SqlConnection("Data Source=<servername>;Initial Catalog=AdventureWorks;Persist Security Info=True;User ID=uid;Password=pwd;Asynchronous Processing=true");

        _cmdEmp = new SqlCommand("getEmployee", _con);
        _cmdEmp.CommandType = CommandType.StoredProcedure;
        _cmdEmp.Parameters.AddWithValue("@NationalID", TextBox1.Text);

        _con.Open();

        _empAsyncResult = _cmdEmp.BeginExecuteReader(new AsyncCallback(CBMethod), CommandBehavior.CloseConnection);

    }
    catch (Exception ex) { }
}

public void CBMethod(SQLAsyncResult ar)
{
    SqlDataReader _emp;

    _emp=_ar.EndExecuteReader(ar);

    GridView1.DataSource = _emp;
    GridView1.DataBind();
}
{% endhighlight %}

This code should've worked but it didn't. The first and foremost reason is that there exist no `SQLAsyncResult` class in .NET. I did some Google on this, but I found no such class, even there is no documentation for this class in MSDN. I used `IAsyncResult` class instead and made some necessary changes in the code. After that the code looked like below:

{% highlight csharp %}
protected void Button1_Click(object sender, EventArgs e)
{
    SqlConnection _con;
    SqlCommand _cmdEmp;

    try
    {
        _con = new SqlConnection("Data Source=<servername>;Initial Catalog=AdventureWorks;Persist Security Info=True;User ID=uid;Password=pwd;Asynchronous Processing=true");

        _cmdEmp = new SqlCommand("getEmployee", _con);
        _cmdEmp.CommandType = CommandType.StoredProcedure;
        _cmdEmp.Parameters.AddWithValue("@NationalID", TextBox1.Text);

        _con.Open();

        //Used _cmdEmp instead of CommandBehavior.CloseConnection
        _empAsyncResult = _cmdEmp.BeginExecuteReader(new AsyncCallback(CBMethod), _cmdEmp);
    }
    catch (Exception ex) { }
}

public void CBMethod(IAsyncResult ar)
{
    SqlDataReader dr;
    DataTable dt = new DataTable();

    try
    {
        SqlCommand _cmd = (SqlCommand)ar.AsyncState;
        dr = _cmd.EndExecuteReader(ar);
        dt.Load(dr);
        GridView1.DataSource = dt;
        GridView1.DataBind();

        dr.Close();
        _cmd.Connection.Close();

    }
    catch (Exception ex) { }
}
{% endhighlight %}

I tried this code(which removed compilation error of `SQLAsyncResult`), but this also produce no output in page; i.e. no data came in my GridView. I did some research on Internet, but found no concrete solution for this problem.

I did some RND with my code and found out that Callback function was being called after page's prerendering is completed. Once prerendering is completed, changes made/ new data bounded in page's child control will not take effect. You can check the ASP.NET page life cycle events from [here](http://msdn.microsoft.com/en-us/library/ms178472%28v=vs.80%29.aspx) to understand my theory better.
As we're using asynchronous parallel processing, there is a fare chance that Page's rendering is done even before the query execution completes.

## Workaround ##

What I thought as a workaround for this problem is to delay the prerender for my gridview a bit and put it on hold until the query execution completes. So I added a bit of code to handle GridView's prerendering event.

{% highlight csharp %}
IAsyncResult _empAsyncResult;
bool isGridBound = false;    
protected void Page_Load(object sender, EventArgs e)
{
    isGridBound = false;
}

protected void Button1_Click(object sender, EventArgs e)
{
    SqlConnection _con;
    SqlCommand _cmdEmp;

    try
    {
        _con = new SqlConnection("Data Source=<servername>;Initial Catalog=AdventureWorks;Persist Security Info=True;User ID=uid;Password=pwd;Asynchronous Processing=true");

        _cmdEmp = new SqlCommand("getEmployee", _con);
        _cmdEmp.CommandType = CommandType.StoredProcedure;
        _cmdEmp.Parameters.AddWithValue("@NationalID", TextBox1.Text);

        _con.Open();

        //Used _cmdEmp instead of CommandBehavior.CloseConnection
        _empAsyncResult = _cmdEmp.BeginExecuteReader(new AsyncCallback(CBMethod), _cmdEmp);

        
    }
    catch (Exception ex) { }
}

public void CBMethod(IAsyncResult ar)
{
    SqlDataReader dr;
    DataTable dt = new DataTable();

    try
    {
        SqlCommand _cmd = (SqlCommand)ar.AsyncState;
        dr = _cmd.EndExecuteReader(ar);
        dt.Load(dr);
        GridView1.DataSource = dt;
        GridView1.DataBind();
        isGridBound = true;
        dr.Close();
        _cmd.Connection.Close();       

    }
    catch (Exception ex) { }
}

/* in addition with adding the below method, GridView control in the page also needs to be changed a bit to delegate prerender event.
<asp:GridView ID="GridView1" runat="server" onprerender="GridView_PreRender"
</asp:GridView>
*/
protected void GridView_PreRender(object sender, EventArgs e)
{
    while (_empAsyncResult != null && isGridBound == false)
        System.Threading.Thread.Sleep(50);
}
{% endhighlight %}

I executed this code and there I got my gridview displayed on page. :smile:

## Enhancement ##

Now if another Gridview is required to display the payment change history for the employee. How that can be done using the same procedure? Of course a second delegate method same as `CBMethod` can be written and a second SqlCommand object will initiate the Asynchronous query execution and will pass it to the new delegate function. But what if I want to use the same function `CBMethod` for this second gridview?

Now I should discuss a bit about `BeginExecuteReader` method. It has [four overloads](http://msdn.microsoft.com/en-us/library/0h27k1xk) out of which we're going to focus on `BeginExecuteReader(AsyncCallback callback,Object stateObject)`.You can find the below documentation in [MSDN](http://msdn.microsoft.com/en-us/library/7szdt0kc):

>>callback
>>
>>Type: [System.AsyncCallback](http://msdn.microsoft.com/en-us/library/system.asynccallback)
>>
>>An [AsyncCallback](http://msdn.microsoft.com/en-us/library/system.asynccallback) delegate that is invoked when the command's execution has completed. Pass null (Nothing in Microsoft Visual Basic) to indicate that no callback is required.
>
>>stateObject
>>
>>Type: [System.Object](http://msdn.microsoft.com/en-us/library/system.object)
>>
>>A user-defined state object that is passed to the callback procedure. Retrieve this object from within the callback procedure using the [AsyncState](http://msdn.microsoft.com/en-us/library/system.iasyncresult.asyncstate) property.

Using the first parameter you'll refer to the method that needs to be called after the query execution is complete.
 The second parameter is crucial. Using this parameter, you can pass any object to your delegate function, even object of your custom class. This object of the custom class can also be retrieved in the delegate function.
For example you have created one class named MyClass and you've passed its object to the delegate function. Now in delegate function you can write a small piece of code to retrieve your object.

{% highlight csharp %}
MyClass objMyClass = (MyClass)ar.AsyncState;//ar is the object of IAsyncResult, passed to the delegate method.
{% endhighlight %}

After you've retrieved the object, further processing on the same can be done. Using this logic, I created a custom class that has two members: one SqlCommand object and one string that will store the GridView control id. At the time of initiating asynchronous execution one object of this class will be passed to the delegate method. On callback the same object will be retrieved. Data fetched from the database will be bound as per the Gridview Control ID provided by the custom object.

Here goes my [final code](https://docs.google.com/open?id=0B4Wl0CqfSBnkZEJYRGEyOVdCd3M):

Aspx Page

{% highlight html %}
<%@ Page Language="C#" AutoEventWireup="true" CodeFile="AsyncCallback.aspx.cs" Inherits="AsyncApproachADONET_AsyncCallBack" %>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <title>Untitled Page</title>
</head>
<body>
    <form id="form1" runat="server">
    <asp:Label ID="Label1" runat="server" Text="National Security Number: "></asp:Label>
&nbsp;&nbsp;&nbsp;
    <asp:TextBox ID="TextBox1" runat="server"></asp:TextBox>
&nbsp;
    <asp:Button ID="Button1" runat="server" Text="Button" onclick="Button1_Click" />
    <br />
    <br />
    <asp:GridView ID="GridView1" runat="server" onprerender="GridView_PreRender">
    </asp:GridView>
    <br />    
    <asp:GridView ID="GridView2" runat="server" onprerender="GridView_PreRender">
    </asp:GridView>    
    <br />
    <div>    
    </div>
    </form>
</body>
</html>
{% endhighlight %}

Code Behind:

{% highlight csharp %}
using System;
using System.Collections;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.Security;
using System.Web.UI;
using System.Web.UI.HtmlControls;
using System.Web.UI.WebControls;
using System.Web.UI.WebControls.WebParts;
using System.Xml.Linq;
using System.Threading;
using System.IO;

public partial class AsyncApproachADONET_AsyncCallBack : System.Web.UI.Page
{
    IAsyncResult _empAsyncResult, _payHistAsyncResult;
    
    int NoOfGridToBeBound = 0;
    int NoOfGridBounded = 0;
    protected void Page_Load(object sender, EventArgs e)
    {
        NoOfGridToBeBound = 0;
        NoOfGridBounded = 0;
    }

    protected void Button1_Click(object sender, EventArgs e)
    {
        SqlConnection _con;
        SqlCommand _cmdEmp, _cmdPayHist;

        try
        {
            /* MultipleActiveResultSets=true needs to be added in the connection string to process multiple command execution using same connection*/

            _con = new SqlConnection("Data Source=<servername>;Initial Catalog=AdventureWorks;Persist Security Info=True;User ID=uid;Password=pwd;Asynchronous Processing=true;MultipleActiveResultSets=true");

            _cmdEmp = new SqlCommand("getEmployee", _con);
            _cmdEmp.CommandType = CommandType.StoredProcedure;
            _cmdEmp.Parameters.AddWithValue("@NationalID", TextBox1.Text);

            _cmdPayHist = new SqlCommand("getPayHistory", _con);
            _cmdPayHist.CommandType = CommandType.StoredProcedure;
            _cmdPayHist.Parameters.AddWithValue("@NationalID", TextBox1.Text);
            _con.Open();

            _empAsyncResult = _cmdEmp.BeginExecuteReader(new AsyncCallback(CBMethod), new CMDandGridview(_cmdEmp, "GridView1"));
            _payHistAsyncResult = _cmdPayHist.BeginExecuteReader(new AsyncCallback(CBMethod), new CMDandGridview(_cmdPayHist, "GridView2"));
            NoOfGridToBeBound = 2;
        }
        catch (Exception ex) { }
    }

    public void CBMethod(IAsyncResult ar)
    {
        SqlDataReader dr;
        DataTable dt = new DataTable();

        try
        {
            
            CMDandGridview _cmdngrdv = (CMDandGridview)ar.AsyncState;
            SqlCommand _cmd = (SqlCommand)_cmdngrdv._mcmd;
            GridView _grdv = (GridView)Page.FindControl(_cmdngrdv._mgridViewName);
            dr = _cmd.EndExecuteReader(ar);
            dt.Load(dr);
            _grdv.DataSource = dt;
            _grdv.DataBind();
            dr.Close();
            NoOfGridBounded++;
            if (NoOfGridToBeBound == NoOfGridBounded)
                _cmd.Connection.Close();
        

        }
        catch (Exception ex) { }
    }

    protected void GridView_PreRender(object sender, EventArgs e)
    {
        while (_empAsyncResult != null && NoOfGridBounded != NoOfGridToBeBound)
            System.Threading.Thread.Sleep(500);
    }

    protected class CMDandGridview
    {
        public SqlCommand _mcmd;
        public string _mgridViewName;

        public CMDandGridview(SqlCommand _mcmd, string _mgridViewName)
        {
            this._mcmd = _mcmd;
            this._mgridViewName = _mgridViewName;
        }
    }
}
{% endhighlight %}

**Note:** This article is written based on hands on experience. If anyone find any data incorrect or alternative process for doing the same thing, kindly let me know, I'll correct the same.

Hope this helps.