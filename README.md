analytics-node
==============

[![Build Status](https://travis-ci.org/segmentio/analytics-node.png)](https://travis-ci.org/segmentio/analytics-node)


analytics-node is a node.js client for [Segment.io](https://segment.io). If you're using client-side javascript, check out [analytics.js](https://github.com/segmentio/analytics.js).

### Node Analytics Made Simple

[Segment.io](https://segment.io) is the cleanest, simplest API for recording analytics data.

Setting up a new analytics solution can be a real pain. The APIs from each analytics provider are slightly different in odd ways, code gets messy, and developers waste a bunch of time fiddling with long-abandoned client libraries. We want to save you that pain and give you an clean, efficient, extensible analytics setup.

[Segment.io](https://segment.io) wraps all those APIs in one beautiful, simple API. Then we route your analytics data wherever you want, whether it's Google Analytics, Mixpanel, Customer io, Chartbeat, or any of our other integrations. After you set up Segment.io you can swap or add analytics providers at any time with a single click. You won't need to touch code or push to production. You'll save valuable development time so that you can focus on what really matters: your product.

```javascript
var analytics = require('analytics-node');
analytics.init({secret: 'MY_API_SECRET'});
analytics.track({userId: 'user@gmail.com', event: 'Played a Song'});
```

and turn on integrations with just one click at [Segment.io](https://segment.io).

![](http://i.imgur.com/YnBWI.png)

More on integrations [here](#integrations).

### High Performance

This client uses an internal queue to efficiently send your events in aggregate, rather than making an HTTP
request every time. This means that it is safe to use in your high scale web server controllers, or in your backend services
without worrying that it will make too many HTTP requests and slow down the program. You no longer need to use a message queue to have analytics.

[Feedback is very welcome!](mailto:friends@segment.io)

## Quick-start

If you haven't yet, get an API secret [here](https://segment.io).

#### Install

```javascript
npm install analytics-node
```
#### Initialize the client

The default and easiest method for most apps is to just use the API client as a module. To get started, just initialize it once:

```javascript
var analytics = require('analytics-node');
analytics.init({secret: 'YOUR_API_SECRET'});
```
Then whenever you `require('analytics-node')` from any other file in your app, you'll have access to the same client.

#### Identify a User

Identifying a user ties all of their actions to an id, and associates user `traits` to that id.

```javascript
analytics.identify({
    sessionId : String
    userId    : String
    traits    : Object,
    timestamp : Date
});
```

**sessionId** (String) is a unique id associated with an anonymous user **before** they are logged in. If the user
is logged in, you can use null here.

**userId** (String) is the user's id **after** they are logged in. It's the same id as which you would recognize a signed-in user in your system. Note: you must provide either a `sessionId` or a `userId`.

**traits** (Object) is a dictionary with keys like `subscriptionPlan` or `age`. You only need to record a trait once, no need to send it again.

**timestamp** (Date, optional) is a Javascript date object representing when the track took place. If the **identify** just happened, leave it blank and we'll use the server's time. If you are importing data from the past, make sure you provide this argument.


```javascript
analytics.identify({
    sessionId : 'DKGXt384hFDT82D',
    userId    : '019mr8mf4r',
    traits    : {
        name             : 'Achilles',
        email            : 'achilles@segment.io'
        subscriptionPlan : 'Premium',
        friendCount      : 29
    }
});

```

#### Track an Action

Whenever a user triggers an event, you’ll want to track it.

```javascript
analytics.track({
    sessionId  : String,
    userId     : String,
    event      : String,
    properties : Object,
    timestamp  : Date
});
```

**sessionId** (String) is a unique id associated with an anonymous user **before** they are logged in. Even if the user
is logged in, you can still send us the **sessionId** or you can just use `null`.

**userId** (String) is the user's id **after** they are logged in. It's the same id as which you would recognize a signed-in user in your system. Note: you must provide either a `sessionId` or a `userId`.

**event** (String) describes what this user just did. It's a human readable description like "Played a Song", "Printed a Report" or "Updated Status".

**properties** (Object) is a dictionary with items that describe the event in more detail. This argument is optional, but highly recommended—you’ll find these properties extremely useful later.

**timestamp** (Date, optional) is a Javascript date object representing when the track took place. If the event just happened, leave it blank and we'll use the server's time. If you are importing data from the past, make sure you provide this argument.

```javascript

analytics.track({
    sessionId  : 'DKGXt384hFDT82D',
    userId     : '019mr8mf4r',
    event      : 'Listened to a song',
    properties : {
        revenue        : 39.95,
        shippingMethod : '2-day'
    }
});
```

That's it, just two functions!

## Integrations

There are two main modes of analytics integration: client-side and server-side. You can use just one, or both.

#### Client-side vs. Server-side

* **Client-side analytics** - (via [analytics.js](https://github.com/segmentio/analytics.js)) works by loading in other integrations
in the browser.

* **Server-side analytics** - (via [analytics-node](https://github.com/segmentio/analytics-node) and other server-side libraries) works
by sending the analytics request to [Segment.io](https://segment.io). Our servers then route the message to your desired integrations.

Some analytics services have REST APIs while others only support client-side integrations.

You can learn which integrations are supported server-side vs. client-side on your [project's integrations]((https://segment.io) page.

## Advanced

### Batching Behavior

By default, the client will flush:

+ the first time it gets a message
+ every 20 messages (control with `flushAt`)
+ if 10 seconds has passed since the last flush (control with `flushAfter`)

#### Turn off Batching

When debugging, or in short-lived programs, you might want the client to make the request right away. In this case, you can turn off batching by setting the `flushAt` argument to 1.

```javascript
analytics.init({ secret: 'MY_API_SECRET', flushAt: 1 });
````

#### Flush Whenever You Want

At the end of your program, you may want to flush to make sure there's nothing left in the queue.

```javascript
analytics.flush(function (err) {
    console.log('Flushed, and now this program can exit!');
});
```

#### Why Batch?

This client is built to support high performance environments. That means it is safe to use analytics-node in a web server that is serving hundreds of requests per second.

**How does the batching work?**

Every action **does not** result in an HTTP request, but is instead queued in memory. Messages are flushed in batch in the background, which allows for much faster operation.

**What happens if there are just too many messages?**

If the client detects that it can't flush faster than it's receiving messages, it'll simply stop accepting messages. This means your program won't crash because of a backed up analytics queue.

#### Message Acknowledgement

Batching means that your message might not get sent right away.

**How do I know when this specific message is flushed?**

Every `identify` and `track` returns a promise, which you can use to know when that message is flushed.

```javascript
var analytics = require('analytics-node');

var promise = analytics.track({ userId : 'calvin@segment.io',
                                event  : 'Plays Ultimate' });

promise.on('flush', function () {
    console.log("I'm 2000 miles away now!");
});

promise.on('err', function (err) {
    console.log('Error occured: ', err);
    // [Error: We couldnt find an app with that "secret". Have you created it at segment.io? If so, please double check it.]
});
```

**How do I know when __any__ messages are flushed?**

You can use the `analytics` client as an event emitter to listen for any flushes or errors.

```javascript
var analytics = require('analytics-node');

analytics.on('flush', function () {
    console.log('I just got flushed. YAY!');
});
```

### Error Handling

In order to handle errors, the node client will emit every time an error occurs. To prevent analytics-node from crashing your server with an unhandled exception, it emits on `err` rather than the more conventional `error`.

During integration, we recommend listening on the `err` event to make sure that all the data is being properly recorded.

```javascript
analytics.on('err', function (err) {
    console.warn('Error occured', err);
    // [Error: We couldnt find an app with that "secret". Have you created it at segment.io? If so, please double check it.]
});
```

### Events

You may also listen on `analytics` variable for the following events:

* **initialize** - when the client is initialized and able to record events.
* **flush** - after the client flushes part of its queue.
* **err** - when an error in the tracking code or connection happens.

### Understanding the Client Options

If you hate defaults, than you'll love how configurable the analytics-node is.
Check out these gizmos:

```javascript
var analytics = require('analytics-node');
analytics.init({
    secret        : 'MY_API_SECRET',

    flushAt       : 20,
    flushAfter    : 10000,

    maxQueueSize  : 10000,
    timerInterval : 10000,
    triggers      : [analytics.triggers.size, analytics.triggers.time]
});
```

* **flushAt** (Number) - Flush after this many messages are in the queue.
* **flushAfter** (Number) - Flush after this many milliseconds have passed since the last flush.
* **maxQueueSize** (Number) - Stop accepting messages into the queue after this many messages are backlogged in the queue.
* **timerInterval** (Number) - Check this many milliseconds to see if there's anything to flush.
* **triggers** (Array[Function]) - An array of trigger functions that determine when it's time to flush.

### Multiple Clients

Different parts of your app may require different types of batching. In that case, you can initialize different `analytic-node` client instances. The API is exactly the same.

```javascript
var analytics = new require('analytics-node').Client();
analytics.init({secret: 'MY_API_SECRET', ...});
```

## Testing

```bash
npm test
```

## License

```
WWWWWW||WWWWWW
 W W W||W W W
      ||
    ( OO )__________
     /  |           \
    /o o|    MIT     \
    \___/||_||__||_|| *
         || ||  || ||
        _||_|| _||_||
       (__|__|(__|__|
```

(The MIT License)

Copyright (c) 2012 Segment.io Inc. <friends@segment.io>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
