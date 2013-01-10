analytics-node
==============

analytics-node is a node.js client for [Segment.io](https://segment.io). It's the sister API of the popular [analytics.js](https://github.com/segmentio/analytics.js).

### Simpler Analytics

[Segment.io](https://segment.io) is the simplest way to integrate analytics into your application. You integrate with one API, and you can turn on any other analytics service with a push of a button. No more learning new APIs, no more repeated code, and no more wasted development time.

```javascript
var analytics = require('analytics-node');
analytics.init({apiKey: 'MY_API_KEY'}});
analytics.track({userId: 'user@gmail.com', event: 'Played a Song'});
```

and then turn on integrations with one click on [Segment.io](https://segment.io).

![Google Analytics](http://www.koozai.com/blog/wp-content/uploads/2011/06/Google-Analytics1.png)

![Mixpanel](http://www.theresumator.com/images/cms-testimonials/mixpanel.gif)

![KISSMetrics](https://cloudability.com/images/customers/kiss_metrics.jpg)

... and many more.

### Design

This client is designed for **high performance**. It uses an internal queue to efficiently send your events in aggregate, rather than making an HTTP
request every time. This means that it is safe to use in your web server controllers, or in back-end services
without worrying that it will make too many HTTP requests and slow down the program.

You can control the batching behavior as described [below](#advanced).

## Quick-start

If you haven't yet, register for a project [here](https://segment.io).

#### Install

```javascript
npm install analytics-node
```
#### Initialize the client

The default and easiest method for most apps is to just use the API client as a module. To get started, just use the following:

```javascript
var analytics = require('analytics-node');
analytics.init({apiKey: 'MY_API_KEY'}});
```
Then whenever you `require('analytics-node')` from your app, you'll have access to the same client.

You can also create your own client if you'd like a little more customization. The API is exactly the same.
```javascript
var analytics = new require('analytics-node').Client();
analytics.init({apiKey: 'MY_API_KEY'});
```

#### Identify a User

Identifying a user ties all of their actions to an ID, and associates user `traits` to that ID.

```javascript
analytics.identify({
    sessionId : String
    userId    : String
    traits    : Object,
    timestamp : Date
});
```

**sessionId** (string) is a unique id associated with an anonymous user **before** they are logged in. If the user
is logged in, you can use null here.

**userId** (string) is the user's id **after** they are logged in. It's the same id as which you would recognize a signed-in user in your system. Note: you must provide either a `sessionId` or a `userId`.

**traits** (object) is a dictionary with keys like “Subscription Plan” or “Age”. Once you record a trait, no need to send it again, so the traits argument is optional.

**timestamp** (Date) is a Date object representing when the track took place. It is optional. If this event just happened, leave it blank and we'll use the server's time. If you are importing data from the past, make sure you provide this argument.

```javascript
analytics.identify({
    sessionId : 'DKGXt384hFDT82D',
    userId : 'ilya@segment.io',
    traits : {
        'First Name': 'Ilya',
        'Last Name': 'Volodarsky',
        'Subscription Plan': 'Premium',
        'On Mailing List': true
    },
    timestamp: new Date('2012-12-02T00:30:08.276Z')
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

**sessionId** (string) is a unique id associated with an anonymous user **before** they are logged in. If the user
is logged in, you can use null here.

**userId** (string) is the user's id **after** they are logged in. It's the same id as which you would recognize a signed-in user in your system. Note: you must provide either a `sessionId` or a `userId`.

**event** (string) describes what this user just did. It's a human readable description like "Played a Song", "Printed a Report" or "Updated Status".

**properties** (object) is a dictionary with items that describe the event in more detail. This argument is optional, but highly recommended—you’ll find these properties extremely useful later.

**timestamp** (Date) is a Date object representing when the track took place. It is optional. If this event just happened, leave it blank and we'll use the server's time. If you are importing data from the past, make sure you provide this argument.

```javascript

segmentio.track({
    sessionId : 'DKGXt384hFDT82D',
    userId : 'ilya@segment.io',
    event : 'Listened to a song',
    properties : {
        'Title': 'Eleanor Rigby',
        'Artist': 'Beatles',
        'Playlist': 'Popular'
    },
    timestamp: new Date('2012-12-02T00:30:08.276Z')
});
```

## Advanced

#### Batching Behavior

By default, the client will flush

1. the first time it gets a message
1. every 20 messages (control with `flushAt`)
1. if 10 seconds passes without a flush (control with `flushAfter`)

#### Turn off Batching

When debugging or in short-lived programs, you might want the client to make the request right away. In this case, you can turn off batching by setting the `flushAt` argument to 1.

```javascript
analytics.initialize({ apiKey: 'API_KEY', flushAt: 1 });
````

#### Flush Whenever You Want

At the end of your program, you may want to flush to make sure there's nothing left in the queue.

```javascript
analytics.flush(function () {
    console.log('Flushed, and now I can exit!');
});
```

#### Why Batch?

This client is built to support high performance environments. That means you can put analytics-node into a web server that is serving hundreds of hits per second.

** Why is that possible? **

Every action **does** not incur does not result in an HTTP request, allowing the system to not get bogged down processing network IO

** What happens if there's just too many messages? **

If the client detects that it can't flush faster than its receiving messages, it will simply stop accepting messages.

This means your program won't crash because of a backed up analytics queue.

#### Understanding the Client Options

If you hate defaults, than you'll love how configurable the analytics-node is.
Check out these gizmos:

```javascript
var analytics = require('analytics-node');
analytics.init({
    apiKey        : 'API_KEY',

    flushAt       : 20,
    flushAfter    : 10000,

    maxQueueSize  : 10000,
    timerInterval : 10000,
    triggers      : [analytics.triggers.size, analytics.triggers.time]
});
```

* **flushAt** (Number): Flush after this many messages are in the queue.
* **flushAfter** (Number): Flush after this many milliseconds have passed since the last flush.
* **maxQueueSize** (Number): Stop accepting messages into the queue after this many messages are backlogged in the queue.
* **timerInterval** (Number): Check every `timerInterval` milliseconds to see if there's anything to flush.
* **triggers** (Array[Function]): An array of `trigger` functions that determine when it's time to flush.

#### Message Acknowledgement

Batching means that your message might not get sent right away.

** How do I know when my message is flushed and received? **

```javascript
var analytics = require('analytics-node');

var promise = analytics.track({ userId : 'calvin@segment.io',
                                event  : 'Plays Ultimate' });

promise.on('flushed', function () {
    console.log('Flushed to server at some point in the future!')
});

promise.on('err', function (err) {
    console.log('Error occured: ' + err);
    // [Error: We couldnt find an app with that API_KEY. Have you created it at segment.io? If so, please double check it.]
});
```

** How do I know when __any__ messages are flushed? **

```javascript
var analytics = require('analytics-node');

analytics.on('flushed', function () {
    console.log('Flushed to server at some point in the future!')
});

analytics.on('err', function (err) {
    console.log('Analytics error occured',  err);
    // [Error: We couldnt find an app with that API_KEY. Have you created it at segment.io? If so, please double check it.]
});
```

## Troubleshooting

#### Error Handling and Integration

In order to handle errors, the node client will emit every time an error occurs. To prevent analytics-node from crashing your server with an unhandled exception, it emits on `err` rather than the more conventional `error`.

During integration, we recommend listening on the `err` event to make sure that all the data is being properly recorded.

```javascript
analytics.on('err', function() {
    console.warn('Analytics error occured', err);
});
```

#### Other Events

You may also listen on the following events for more fine-grained granularity.

* **flushed** - when the client has sent its queue to the server
* **flushing** - when the client is in the process of submitting its queue
* **err** - when an error in the tracking code or connection happens.
* **initialized** - when the client is initialized and able to record events.

#### Testing

```bash
npm test
```

#### License

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