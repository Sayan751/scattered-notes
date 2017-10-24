---
layout: post
title:  "SQL: CSV To Table using xml"
date:   2012-07-20 08:32:00+0530
categories: sql
postid: "sql-csv-to-table-using-xml"
tags: [sql]
---
**Disclaimer:** This is a prehistoric post :smile:, moved as is (with minor formatting change) from my [old blog](http://programersnotebook.blogspot.de/2012/07/sql-csv-to-table-using-xml.html).

In this article I'm going to discuss about how to convert a comma separated string to a table to enable it for set based operation.
Lets say we've a table which has the definition like this :

{% highlight sql %}
CREATE TABLE Employee
(
    EmpId INT,
    EmployeeName VARCHAR(100)
)
{% endhighlight %}

## Problem Statement ##

You need to retrieve  Employee Name based on EmpId provided. Now it is easier to retrieve the data when you have the EmpIds separately and the same can be used as below :

{% highlight sql %}
SELECT *
FROM Employee
WHERE EmpId IN (10,21,32,43,54,74,78,47,56,12,68)
{% endhighlight %}

The above query treats every EmpId separately. Now what if you get all the EmpIds in a single comma separated string like : `'10,21,32,43,54,74,78,47,56,12,68,'`. In that case you cannot write query as below:

{% highlight sql %}
SELECT *
FROM Employee
WHERE EmpId IN ('10,21,32,43,54,74,78,47,56,12,68,')
{% endhighlight %}

The above query will not treat the EmpIds separately, but as a single csv string as a result this query will produce an erroneous result or may not parsed at all.

## Solution ##

Now to process the csv effectively (so that it can be used for set based operation) we need to convert this csv to a table (set). You need to create the below procedure for the same.
{% highlight sql %}
CREATE PROC csvToTable_xml
(
    @csv NVARCHAR(4000),
    @Delimiter NCHAR(1) = N','
)
AS
BEGIN
    DECLARE @xml xml,@hDoc INT

    SELECT @xml=N'<Table>' +
                N'<row><col>'+Replace(@csv,@Delimiter,'</col></row><row><col>') +
                N'</col></row>' +
                N'</Table>'

    EXEC sp_xml_preparedocument @hDoc OUTPUT, @xml

    SELECT LTRIM(RTRIM(col))
    FROM OPENXML(@hDoc, '/Table/row',2) WITH  ( col VARCHAR(100))
    WHERE Isnull(LTRIM(RTRIM(col)),'')<>''
END
{% endhighlight %}

### Usage: ###

{% highlight sql %}
DECLARE @tab Table
(
    SerialNo INT IDENTITY(1,1),
    VAL  VARCHAR(100)
)
INSERT INTO @tab
EXEC csvToTable_xml @csv=N'10,21,32,43,54,74,78,47,56,12,68,', @Delimiter=N','

SELECT * FROM @tab
{% endhighlight %}

OUTPUT:

| SerialNo | VAL |
|----------|-----|
|1         |10   |
|2         |21   |
|3         |32   |
|4         |43   |
|5         |54   |
|6         |74   |
|7         |78   |
|8         |47   |
|9         |56   |
|10        |12   |
|11        |68   |
{:.table .table-striped}

The above table variable can also be used as below :

{% highlight sql %}
SELECT b.*
FROM  @tab a INNER JOIN
      Employee b ON a.VAL=b.EmpID
{% endhighlight %}

### Explanation ###
Our Stored procedure `csvToTable_xml` accepts two parameters: `@csv` & `@Delimiter`. `@csv` contains the delimited string. `@Delimiter` contains the delimiter, yes you've guessed right, you can use not only comma but any delimiter as you like. Now the idea is to convert this csv to xml something like this :

{% highlight xml %}
<Table>
    <row>     <col>10</col>   </row>
    <row>     <col>21</col>   </row>
    <row>     <col>32</col>   </row>
    <row>     <col>43</col>   </row>
    <row>     <col>54</col>   </row>
    <row>     <col>74</col>   </row>
    <row>     <col>78</col>   </row>
    <row>     <col>47</col>   </row>
    <row>     <col>56</col>   </row>
    <row>     <col>12</col>   </row>
    <row>     <col>68</col>   </row>
    <row>     <col />         </row>
</Table>
{% endhighlight %}

Now from this xml we can easily produce a record set using standard xml functions provided by MSSQL (which we're not going to discuss in this article as it is out of scope).

Hope this helps.