analytics-node
==============

analytics-node is a node.js client for [Segment.io](https://segment.io). [Segment.io] is the simplest way to integrate analytics into your application. You integrate with one API, and you can turn on any other analytics service with a push of a button. No learning new APIs, and no new code pushes. If you haven't yet,
register for a project [here](https://segment.io).

This is the official node.js client that wraps the [Segment.io REST API](https://segment.io/docs) .

## Design

This client uses an internal queue to efficiently send your events in aggregate, rather than making an HTTP
request every time. This means that it is safe to use in your web server controllers, or in back-end services
without worrying that it will make too many HTTP requests and slow down the program.

You can control the batching behavior as described below.

## How to Use

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

## Advanced / Fun

#### Triggering a Flush


#### Adjusting Batching

You can adjust when the

You can adjust the flush triggers in the client. Take a look into the source.

## Error Handling and Integration

In order to handle errors, the node client will emit every time an error occurs. To prevent the segmentio client from crashing your server with an unhandled exception, it emits on `err` rather than the more conventional `error`.

During integration, we recommend listening on the `err` event to make sure that all the data is being properly recorded:
```javascript
segmentio.on('err', function() { console.warn('A segment.io error occured', err); });
```
You may also listen on the following events for more fine-grained granularity.

* **flushed** - when the client has sent its queue to the server
* **flushing** - when the client is in the process of submitting its queue
* **err** - when an error in the tracking code or connection happens.
* **initialized** - when the client is initialized and able to record events.

## Testing

```javascript
npm test
```

## License

(The MIT License)

Copyright (c) 2012 Segment.io Inc. <friends@segment.io>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.