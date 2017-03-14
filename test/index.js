/* global describe, before, beforeEach, it */

var assert = require('assert')
var Analytics = require('..')
var server = require('./server')

var a
var noop = function () {}
var id = 'id'

var context = {
  library: {
    name: 'analytics-node',
    version: require('../package.json').version
  }
}

describe('Analytics', function () {
  before(function (done) {
    server.app
      .post('/v1/batch', server.fixture)
      .listen(server.port, done)
  })

  beforeEach(function () {
    a = Analytics('key', {
      host: 'http://localhost:4063',
      flushAt: Infinity,
      flushAfter: Infinity
    })
  })

  it('should expose a constructor', function () {
    assert.equal('function', typeof Analytics)
  })

  it('should require a write key', function () {
    assert.throws(Analytics, error("You must pass your Segment project's write key."))
  })

  it('should not require the new keyword', function () {
    assert(a instanceof Analytics)
  })

  it('should create a queue', function () {
    assert.deepEqual(a.queue, [])
  })

  it('should set default options', function () {
    var a = Analytics('key')
    assert.equal(a.writeKey, 'key')
    assert.equal(a.host, 'https://api.segment.io')
    assert.equal(a.flushAt, 20)
    assert.equal(a.flushAfter, 10000)
  })

  it('should remove trailing slashes from `.host`', function () {
    var a = Analytics('key', { host: 'http://google.com/////' })
    assert.equal(a.host, 'http://google.com')
  })

  it('should take options', function () {
    var a = Analytics('key', {
      host: 'a',
      flushAt: 1,
      flushAfter: 2
    })
    assert.equal(a.host, 'a')
    assert.equal(a.flushAt, 1)
    assert.equal(a.flushAfter, 2)
  })

  it('should keep the flushAt option above zero', function () {
    var a = Analytics('key', { flushAt: 0 })
    assert.equal(a.flushAt, 1)
  })

  describe('#enqueue', function () {
    it('should add a message to the queue', function () {
      var date = new Date()
      a.enqueue('type', { timestamp: date }, noop)

      var msg = a.queue[0].message
      var callback = a.queue[0].callback

      assert.equal(callback, noop)
      assert.equal(msg.type, 'type')
      assert.deepEqual(msg.timestamp, date)
      assert.deepEqual(msg.context, context)
      assert(msg.messageId)
    })

    it('should not modify the original message', function () {
      var message = { event: 'test' }
      a.enqueue('type', message, noop)
      assert(!message.hasOwnProperty('timestamp'))
    })

    it('should flush the queue if it hits the max length', function (done) {
      a.flushAt = 1
      a.flushAfter = null
      a.flush = done
      a.enqueue('type', {})
    })

    it('should flush after a period of time', function (done) {
      a.flushAt = Infinity
      a.flushAfter = 1
      a.flush = done
      a.enqueue('type', {})
    })

    it('should reset an existing timer', function (done) {
      var i = 0
      a.flushAt = Infinity
      a.flushAfter = 1
      a.flush = function () { i++ }
      a.enqueue('type', {})
      a.enqueue('type', {})
      setTimeout(function () {
        assert.equal(1, i)
        done()
      }, 1)
    })

    it('should extend the given context', function () {
      a.enqueue('type', { event: 'test', context: { name: 'travis' } }, noop)
      assert.deepEqual(a.queue[0].message.context, {
        library: {
          name: 'analytics-node',
          version: require('../package.json').version
        },
        name: 'travis'
      })
    })

    it('should add a message id', function () {
      a.enqueue('type', { event: 'test' }, noop)
      var msg = a.queue[0].message
      assert(msg.messageId)
      assert(/node-[a-zA-Z0-9]{32}/.test(msg.messageId))
    })
  })

  describe('#flush', function () {
    it('should not fail when no items are in the queue', function (done) {
      a.flush(done)
    })

    it('should send a batch of items', function (done) {
      a.flushAt = 2
      enqueue(a, [1, 2, 3])
      a.flush(function (err, data) {
        if (err) return done(err)
        assert.deepEqual(data.batch, [1, 2])
        assert(data.timestamp instanceof Date)
        assert(data.sentAt instanceof Date)
        done()
      })
    })

    it('should callback with an HTTP error', function (done) {
      enqueue(a, ['error'])
      a.flush(function (err, data) {
        assert(err)
        assert.equal(err.message, 'Bad Request')
        done()
      })
    })
  })

  describe('#identify', function () {
    it('should enqueue a message', function () {
      var date = new Date()
      a.identify({ userId: 'id', timestamp: date, messageId: id })
      assert.deepEqual(a.queue[0].message, {
        type: 'identify',
        userId: 'id',
        timestamp: date,
        context: context,
        messageId: id,
        _metadata: { nodeVersion: process.versions.node }
      })
    })

    it('should validate a message', function () {
      assert.throws(a.identify, error('You must pass a message object.'))
    })

    it('should require a userId or anonymousId', function () {
      assert.throws(function () {
        a.identify({})
      }, error('You must pass either an "anonymousId" or a "userId".'))
    })
  })

  describe('#group', function () {
    it('should enqueue a message', function () {
      var date = new Date()
      a.group({ groupId: 'group', userId: 'user', timestamp: date, messageId: id })
      assert.deepEqual(a.queue[0].message, {
        type: 'group',
        userId: 'user',
        groupId: 'group',
        timestamp: date,
        context: context,
        messageId: id,
        _metadata: { nodeVersion: process.versions.node }
      })
    })

    it('should validate a message', function () {
      assert.throws(a.group, error('You must pass a message object.'))
    })

    it('should require a userId or anonymousId', function () {
      assert.throws(function () {
        a.group({})
      }, error('You must pass either an "anonymousId" or a "userId".'))
    })

    it('should require a groupId', function () {
      assert.throws(function () {
        a.group({ userId: 'id' })
      }, error('You must pass a "groupId".'))
    })
  })

  describe('#track', function () {
    it('should enqueue a message', function () {
      var date = new Date()
      a.track({ userId: 'id', event: 'event', timestamp: date, messageId: id })
      assert.deepEqual(a.queue[0].message, {
        type: 'track',
        event: 'event',
        userId: 'id',
        timestamp: date,
        context: context,
        messageId: id,
        _metadata: { nodeVersion: process.versions.node }
      })
    })

    it('should handle a user ids given as a number', function () {
      var date = new Date()
      a.track({ userId: 1, event: 'jumped the shark', timestamp: date, messageId: id })
      assert.deepEqual(a.queue[0].message, {
        userId: 1,
        event: 'jumped the shark',
        type: 'track',
        timestamp: date,
        context: context,
        messageId: id,
        _metadata: { nodeVersion: process.versions.node }
      })
    })

    it('should validate a message', function () {
      assert.throws(a.track, error('You must pass a message object.'))
    })

    it('should require a userId or anonymousId', function () {
      assert.throws(function () {
        a.track({})
      }, error('You must pass either an "anonymousId" or a "userId".'))
    })

    it('should require an event', function () {
      assert.throws(function () {
        a.track({ userId: 'id' })
      }, error('You must pass an "event".'))
    })
  })

  describe('#page', function () {
    it('should enqueue a message', function () {
      var date = new Date()
      a.page({ userId: 'id', timestamp: date, messageId: id })
      assert.deepEqual(a.queue[0].message, {
        type: 'page',
        userId: 'id',
        timestamp: date,
        context: context,
        messageId: id,
        _metadata: { nodeVersion: process.versions.node }
      })
    })

    it('should validate a message', function () {
      assert.throws(a.page, error('You must pass a message object.'))
    })

    it('should require a userId or anonymousId', function () {
      assert.throws(function () {
        a.page({})
      }, error('You must pass either an "anonymousId" or a "userId".'))
    })
  })

  describe('#screen', function () {
    it('should enqueue a message', function () {
      var date = new Date()
      a.screen({ userId: 'id', timestamp: date, messageId: id })
      assert.deepEqual(a.queue[0].message, {
        type: 'screen',
        userId: 'id',
        timestamp: date,
        context: context,
        messageId: id,
        _metadata: { nodeVersion: process.versions.node }
      })
    })

    it('should validate a message', function () {
      assert.throws(a.screen, error('You must pass a message object.'))
    })

    it('should require a userId or anonymousId', function () {
      assert.throws(function () {
        a.screen({})
      }, error('You must pass either an "anonymousId" or a "userId".'))
    })
  })

  describe('#alias', function () {
    it('should enqueue a message', function () {
      var date = new Date()
      a.alias({ previousId: 'previous', userId: 'id', timestamp: date, messageId: id })
      assert.deepEqual(a.queue[0].message, {
        type: 'alias',
        previousId: 'previous',
        userId: 'id',
        timestamp: date,
        context: context,
        messageId: id,
        _metadata: { nodeVersion: process.versions.node }
      })
    })

    it('should validate a message', function () {
      assert.throws(a.alias, error('You must pass a message object.'))
    })

    it('should require a userId', function () {
      assert.throws(function () {
        a.alias({})
      }, error('You must pass a "userId".'))
    })

    it('should require a previousId', function () {
      assert.throws(function () {
        a.alias({ userId: 'id' })
      }, error('You must pass a "previousId".'))
    })
  })
})

/**
 * Create a queue with `messages`.
 *
 * @param {Analytics} a
 * @param {Array} messages
 * @return {Array}
 */

function enqueue (a, messages) {
  a.queue = messages.map(function (msg) {
    return {
      message: msg,
      callback: noop
    }
  })
}

/**
 * Assert an error with `message` is thrown.
 *
 * @param {String} message
 * @return {Function}
 */

function error (message) {
  return function (err) {
    return err.message === message
  }
}
