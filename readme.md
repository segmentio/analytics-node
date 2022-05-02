# analytics-node [![CircleCI](https://circleci.com/gh/segmentio/analytics-node.svg?style=svg&circle-token=68654e8cd0fcd16b1f3ae9943a1d8e20e36ae6c5)](https://circleci.com/gh/segmentio/analytics-node)

A Node.js client for [Segment](https://segment.com) — The hassle-free way to integrate analytics into any application.

<div align="center">
  <img src="https://user-images.githubusercontent.com/16131737/53616724-d409f180-3b98-11e9-9d39-553c958ecf99.png"/>
  <p><b><i>You can't fix what you can't measure</i></b></p>
</div>

Analytics helps you measure your users, product, and business. It unlocks insights into your app's funnel, core business metrics, and whether you have product-market fit.

## Installation

```bash
$ npm install @dreamdata/analytics
```

## Usage


```js
const Analytics = require('@dreamdata/analytics');

const client = new Analytics('write key');

client.identify({
    userId: '019mr8mf4r',
    traits: {
        email: "name1@email.com",
        name: "Name",
        age: 25
    }
})

client.track({
    event: 'Song Played',
    userId: '019mr8mf4r',
    properties: {
        name: "The song title 1",
        artist: "The artist 1"
    }
})

client.identify({
    userId: '971mj8mk7p',
    traits: {
        email: "name2@email.com",
        name: "Name2",
        age: 26
    }
})

client.track({
    event: 'Song Played',
    userId: '971mj8mk7p',
    properties: {
        name: "The song title 2",
        artist: "The artist 2"
    }
})
```

## Batches
Our libraries are built to support high performance environments. That means it is safe to use our Node library on a web server that’s serving hundreds of requests per second.

Every method you call does not result in an HTTP request, but is queued in memory instead. Messages are then flushed in batch in the background, which allows for much faster operation.

By default, our library will flush:

- The very first time it gets a message.
- Every 20 messages (controlled by options.flushAt).
- If 10 seconds has passed since the last flush (controlled by options.flushInterval)
- There is a maximum of 500KB per batch request and 32KB per call.

If you don’t want to batch messages, you can turn batching off by setting the flushAt option to 1, like so:
```js
var analytics = new Analytics('YOUR_WRITE_KEY', { flushAt: 1 });
```
Batching means that your message might not get sent right away. But every method call takes an optional callback, which you can use to know when a particular message is flushed from the queue, like so:

```js
analytics.track({
  userId: '019mr8mf4r',
  event: 'Ultimate Played'
}, function(err, batch){
  if (err) // There was an error flushing your message...
  // Your message was successfully flushed!
});
```
You can also flush on demand. For example, at the end of your program, you need to flush to make sure that nothing is left in the queue. To do that, call the flush method:
```js
analytics.flush(function(err, batch){
  console.log('Flushed, and now this program can exit!');
});
```

## License
Copyright &copy; 2017 Segment Inc. \<friends@segment.com\>