# analytics-node [![CircleCI](https://circleci.com/gh/segmentio/analytics-node.svg?style=svg&circle-token=68654e8cd0fcd16b1f3ae9943a1d8e20e36ae6c5)](https://circleci.com/gh/segmentio/analytics-node)

A Node.js client for [Segment](https://segment.com) — The hassle-free way to integrate analytics into any application.


## Installation

```bash
$ npm install analytics-node
```


## Usage

```js
const Analytics = require('analytics-node');

const client = new Analytics('write key');

client.track({
  event: 'event name',
  userId: 'user id'
});
```


## Documentation

Documentation is available at [https://segment.com/libraries/node](https://segment.com/libraries/node).


## License

Copyright &copy; 2017 Segment Inc. \<friends@segment.com\>
