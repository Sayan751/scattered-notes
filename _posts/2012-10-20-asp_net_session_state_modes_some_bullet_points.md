---
layout: post
title:  "ASP.NET Session State Modes: Some bullet points"
date:   2012-10-20 23:13:00+0530
categories: asp.net
postid: "asp_net_session_state_modes_some_bullet_points"
tags: [.net, asp.net, session, out-of-proc session, aspstate]
---
**Disclaimer:** This is a prehistoric post :smile:, moved as is (with minor formatting change) from my [old blog](http://programersnotebook.blogspot.de/2012/10/aspnet-session-state-modes-some-bullet_20.html).

## Dive directly into topic, No beating around the bush ##

ASP.NET session state mode can be broadly classified into two modes:

- In-Proc, and
- Out-Of-Proc.

As the name suggests *In-Proc* mode maintains session state data in memory of the web server. This means if the web application or the IIS restarts the session data is lost.

*Out-Of-Proc* maintains the data separately outside the memory of web server. This means your session data is not lost even if the web application/IIS restarts. This mode can again be classified into three categories:

- StateServer,
- SQLServer, and
- Custom.

## StateServer ##

Session state data is maintained by a service named ASP.NET State Server. To use this mode make sure the service is up and running on the server(the same can be checked using run-->services.msc). Also make change in the web.config to specify the mode as StateServer.

{% highlight xml %}
<sessionState mode="StateServer"></sessionState>
{% endhighlight %}

## SQLServer ##

Session state is maintained in a SQL server database. In `Web.config` session state mode also needs to be changed. below is example. I’ve set `Integrated Security` to `True` for simplicity, one can surely use SQL credential with proper permission.

{% highlight xml %}
<sessionState 
         mode="SQLServer"
         sqlConnectionString="Data Source=MYCOMPUTER\SQLEXPRESS;Integrated Security=True">
</sessionState>
{% endhighlight %}

While using this mode ensure that `ASPState` database is installed on server.To add `ASPState` database follow the below mentioned steps:

1. Go to `<root>\WINDOWS\Microsoft.NET\Framework\<version>` (for example: `C:\WINDOWS\Microsoft.NET\Framework\v4.0.30319`)
1. Execute aspnet_regsql.exe and finish the steps.
1. Go to CMD and navigate to the path said in step 1.
1. Type the following command to finally add the `ASPState` database to your server: `aspnet_regsql.exe -S MYCOMPUTER\SQLEXPRESS  -E –ssadd`.

`-E` denotes the currently logged on user.
However `–U` and `–P` can also be used to specify SQL User ID and Password explicitly.

## Custom: ##

Session state is maintained on custom storage (Frankly I did not google much on this :grinning:).

One Major point to be noted: Objects to be stored in session in out-of-proc mode (`StateServer` & `SQLServer` mode for sure), must be serializable. Check the below code example:

{% highlight csharp %}
[Serializable]
public class YourCustomClass
{
    public string member1 { get; set; }
    public string member2{ get; set; }

    public person(string m1, string m2)
    {
        member1 = m1;
        member2= m2;
    }
}
{% endhighlight %}

If you want to add objects of class `YourCustomClass` to the session, you must declare the same as `Serializable` by adding the attribute as shown above.
If the class is not specified as `Serializable` and code tries to add the objects of this class to session, code will throw `HttpException` exception. Check the below screen shot for better understanding:

![Exception screenshot](http://2.bp.blogspot.com/-9MDx2i4t138/UILjq71vJtI/AAAAAAAAAjI/SDWCwWdLQM0/s1600/session+state1.JPG).

Well, that all for today. As always, don’t hesitate to correct me.

Hope this helps.