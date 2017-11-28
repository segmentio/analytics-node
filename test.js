import {spy, stub} from 'sinon'
import bodyParser from 'body-parser'
import express from 'express'
import delay from 'delay'
import auth from 'basic-auth'
import pify from 'pify'
import test from 'ava'
import axios from 'axios'
import retries from 'axios-retry'
import uid from 'crypto-token'
import Analytics from '.'
import {version} from './package'

const noop = () => {}

const context = {
  library: {
    name: 'analytics-node',
    version
  }
}

const metadata = { nodeVersion: process.versions.node }
const port = 4063

const createClient = options => {
  options = Object.assign({
    host: `http://localhost:${port}`
  }, options)

  const client = new Analytics('key', options)
  client.flush = pify(client.flush.bind(client))
  client.flushed = true

  return client
}

test.before.cb(t => {
  express()
    .use(bodyParser.json())
    .post('/v1/batch', (req, res) => {
      const batch = req.body.batch

      const { name: writeKey } = auth(req)
      if (!writeKey) {
        return res.status(400).json({
          error: { message: 'missing write key' }
        })
      }

      const ua = req.headers['user-agent']
      if (ua !== `analytics-node ${version}`) {
        return res.status(400).json({
          error: { message: 'invalid user-agent' }
        })
      }

      if (batch[0] === 'error') {
        return res.status(400).json({
          error: { message: 'error' }
        })
      }

      if (batch[0] === 'timeout') {
        return setTimeout(() => res.end(), 5000)
      }

      res.json({})
    })
    .listen(port, t.end)
})

test('expose a constructor', t => {
  t.is(typeof Analytics, 'function')
})

test('require a write key', t => {
  t.throws(() => new Analytics(), 'You must pass your Segment project\'s write key.')
})

test('create a queue', t => {
  const client = createClient()

  t.deepEqual(client.queue, [])
})

test('default options', t => {
  const client = new Analytics('key')

  t.is(client.writeKey, 'key')
  t.is(client.host, 'https://api.segment.io')
  t.is(client.flushAt, 20)
  t.is(client.flushInterval, 10000)
})

test('remove trailing slashes from `host`', t => {
  const client = new Analytics('key', { host: 'http://google.com///' })

  t.is(client.host, 'http://google.com')
})

test('overwrite defaults with options', t => {
  const client = new Analytics('key', {
    host: 'a',
    flushAt: 1,
    flushInterval: 2
  })

  t.is(client.host, 'a')
  t.is(client.flushAt, 1)
  t.is(client.flushInterval, 2)
})

test('keep the flushAt option above zero', t => {
  const client = createClient({ flushAt: 0 })

  t.is(client.flushAt, 1)
})

test('enqueue - add a message to the queue', t => {
  const client = createClient()

  const timestamp = new Date()
  client.enqueue('type', { timestamp }, noop)

  t.is(client.queue.length, 1)

  const item = client.queue.pop()

  t.is(typeof item.message.messageId, 'string')
  t.regex(item.message.messageId, /node-[a-zA-Z0-9]{32}/)
  t.deepEqual(item, {
    message: {
      timestamp,
      type: 'type',
      context,
      _metadata: metadata,
      messageId: item.message.messageId
    },
    callback: noop
  })
})

test('enqueue - stringify userId', t => {
  const client = createClient()

  client.track({
    userId: 10,
    event: 'event'
  }, noop)

  t.is(client.queue.length, 1)

  const item = client.queue.pop()

  t.is(item.message.anonymousId, undefined)
  t.is(item.message.userId, '10')
})

test('enqueue - stringify anonymousId', t => {
  const client = createClient()

  client.screen({
    anonymousId: 157963456373623802,
    name: 'screen name'
  }, noop)

  t.is(client.queue.length, 1)

  const item = client.queue.pop()

  t.is(item.message.userId, undefined)
  // v8 will lose precision for big numbers.
  t.is(item.message.anonymousId, '157963456373623800')
})

test('enqueue - stringify ids handles strings', t => {
  const client = createClient()

  client.screen({
    anonymousId: '15796345',
    // We're explicitly testing the behaviour of the library if a customer
    // uses a String constructor.
    userId: new String('prateek'), // eslint-disable-line no-new-wrappers
    name: 'screen name'
  }, noop)

  t.is(client.queue.length, 1)

  const item = client.queue.pop()

  t.is(item.message.anonymousId, '15796345')
  t.is(item.message.userId.toString(), 'prateek')
})

test('enqueue - don\'t modify the original message', t => {
  const client = createClient()
  const message = { event: 'test' }

  client.enqueue('type', message)

  t.deepEqual(message, { event: 'test' })
})

test('enqueue - flush on first message', t => {
  const client = createClient({ flushAt: 2 })
  client.flushed = false
  spy(client, 'flush')

  client.enqueue('type', {})
  t.true(client.flush.calledOnce)

  client.enqueue('type', {})
  t.true(client.flush.calledOnce)

  client.enqueue('type', {})
  t.true(client.flush.calledTwice)
})

test('enqueue - flush the queue if it hits the max length', t => {
  const client = createClient({
    flushAt: 1,
    flushInterval: null
  })

  stub(client, 'flush')

  client.enqueue('type', {})

  t.true(client.flush.calledOnce)
})

test('enqueue - flush after a period of time', async t => {
  const client = createClient({ flushInterval: 10 })
  stub(client, 'flush')

  client.enqueue('type', {})

  t.false(client.flush.called)
  await delay(20)

  t.true(client.flush.calledOnce)
})

test('enqueue - don\'t reset an existing timer', async t => {
  const client = createClient({ flushInterval: 10 })
  stub(client, 'flush')

  client.enqueue('type', {})
  await delay(5)
  client.enqueue('type', {})
  await delay(5)

  t.true(client.flush.calledOnce)
})

test('enqueue - extend context', t => {
  const client = createClient()

  client.enqueue('type', {
    event: 'test',
    context: { name: 'travis' }
  }, noop)

  const actualContext = client.queue[0].message.context
  const expectedContext = Object.assign({}, context, { name: 'travis' })

  t.deepEqual(actualContext, expectedContext)
})

test('flush - don\'t fail when queue is empty', async t => {
  const client = createClient()

  await t.notThrows(client.flush())
})

test('flush - send messages', async t => {
  const client = createClient({ flushAt: 2 })

  const callbackA = spy()
  const callbackB = spy()
  const callbackC = spy()

  client.queue = [
    {
      message: 'a',
      callback: callbackA
    },
    {
      message: 'b',
      callback: callbackB
    },
    {
      message: 'c',
      callback: callbackC
    }
  ]

  const data = await client.flush()
  t.deepEqual(Object.keys(data), ['batch', 'timestamp', 'sentAt'])
  t.deepEqual(data.batch, ['a', 'b'])
  t.true(data.timestamp instanceof Date)
  t.true(data.sentAt instanceof Date)
  t.true(callbackA.calledOnce)
  t.true(callbackB.calledOnce)
  t.false(callbackC.called)
})

test('flush - respond with an error', async t => {
  const client = createClient()
  const callback = spy()

  client.queue = [
    {
      message: 'error',
      callback
    }
  ]

  await t.throws(client.flush(), 'Bad Request')
})

test('flush - time out if configured', async t => {
  const client = createClient({timeout: 500})
  const callback = spy()

  client.queue = [
    {
      message: 'timeout',
      callback
    }
  ]

  await t.throws(client.flush(), 'timeout of 500ms exceeded')
})

test('identify - enqueue a message', t => {
  const client = createClient()
  stub(client, 'enqueue')

  const message = { userId: 'id' }
  client.identify(message, noop)

  t.true(client.enqueue.calledOnce)
  t.deepEqual(client.enqueue.firstCall.args, ['identify', message, noop])
})

test('identify - require a userId or anonymousId', t => {
  const client = createClient()
  stub(client, 'enqueue')

  t.throws(() => client.identify(), 'You must pass a message object.')
  t.throws(() => client.identify({}), 'You must pass either an "anonymousId" or a "userId".')
  t.notThrows(() => client.identify({ userId: 'id' }))
  t.notThrows(() => client.identify({ anonymousId: 'id' }))
})

test('group - enqueue a message', t => {
  const client = createClient()
  stub(client, 'enqueue')

  const message = {
    groupId: 'id',
    userId: 'id'
  }

  client.group(message, noop)

  t.true(client.enqueue.calledOnce)
  t.deepEqual(client.enqueue.firstCall.args, ['group', message, noop])
})

test('group - require a groupId and either userId or anonymousId', t => {
  const client = createClient()
  stub(client, 'enqueue')

  t.throws(() => client.group(), 'You must pass a message object.')
  t.throws(() => client.group({}), 'You must pass either an "anonymousId" or a "userId".')
  t.throws(() => client.group({ userId: 'id' }), 'You must pass a "groupId".')
  t.throws(() => client.group({ anonymousId: 'id' }), 'You must pass a "groupId".')
  t.notThrows(() => {
    client.group({
      groupId: 'id',
      userId: 'id'
    })
  })

  t.notThrows(() => {
    client.group({
      groupId: 'id',
      anonymousId: 'id'
    })
  })
})

test('track - enqueue a message', t => {
  const client = createClient()
  stub(client, 'enqueue')

  const message = {
    userId: 1,
    event: 'event'
  }

  client.track(message, noop)

  t.true(client.enqueue.calledOnce)
  t.deepEqual(client.enqueue.firstCall.args, ['track', message, noop])
})

test('track - require event and either userId or anonymousId', t => {
  const client = createClient()
  stub(client, 'enqueue')

  t.throws(() => client.track(), 'You must pass a message object.')
  t.throws(() => client.track({}), 'You must pass either an "anonymousId" or a "userId".')
  t.throws(() => client.track({ userId: 'id' }), 'You must pass an "event".')
  t.throws(() => client.track({ anonymousId: 'id' }), 'You must pass an "event".')
  t.notThrows(() => {
    client.track({
      userId: 'id',
      event: 'event'
    })
  })

  t.notThrows(() => {
    client.track({
      anonymousId: 'id',
      event: 'event'
    })
  })
})

test('page - enqueue a message', t => {
  const client = createClient()
  stub(client, 'enqueue')

  const message = { userId: 'id' }
  client.page(message, noop)

  t.true(client.enqueue.calledOnce)
  t.deepEqual(client.enqueue.firstCall.args, ['page', message, noop])
})

test('page - require either userId or anonymousId', t => {
  const client = createClient()
  stub(client, 'enqueue')

  t.throws(() => client.page(), 'You must pass a message object.')
  t.throws(() => client.page({}), 'You must pass either an "anonymousId" or a "userId".')
  t.notThrows(() => client.page({ userId: 'id' }))
  t.notThrows(() => client.page({ anonymousId: 'id' }))
})

test('screen - enqueue a message', t => {
  const client = createClient()
  stub(client, 'enqueue')

  const message = { userId: 'id' }
  client.screen(message, noop)

  t.true(client.enqueue.calledOnce)
  t.deepEqual(client.enqueue.firstCall.args, ['screen', message, noop])
})

test('screen - require either userId or anonymousId', t => {
  const client = createClient()
  stub(client, 'enqueue')

  t.throws(() => client.screen(), 'You must pass a message object.')
  t.throws(() => client.screen({}), 'You must pass either an "anonymousId" or a "userId".')
  t.notThrows(() => client.screen({ userId: 'id' }))
  t.notThrows(() => client.screen({ anonymousId: 'id' }))
})

test('alias - enqueue a message', t => {
  const client = createClient()
  stub(client, 'enqueue')

  const message = {
    userId: 'id',
    previousId: 'id'
  }

  client.alias(message, noop)

  t.true(client.enqueue.calledOnce)
  t.deepEqual(client.enqueue.firstCall.args, ['alias', message, noop])
})

test('alias - require previousId and userId', t => {
  const client = createClient()
  stub(client, 'enqueue')

  t.throws(() => client.alias(), 'You must pass a message object.')
  t.throws(() => client.alias({}), 'You must pass a "userId".')
  t.throws(() => client.alias({ userId: 'id' }), 'You must pass a "previousId".')
  t.notThrows(() => {
    client.alias({
      userId: 'id',
      previousId: 'id'
    })
  })
})

const { RUN_E2E_TESTS } = process.env

if (RUN_E2E_TESTS) {
  // An end to end to test that sends events to a Segment source, and verifies that a webhook
  // connected to the source (configured manually via the app) is able to receive the data
  // sent by this library.
  // This is described in more detail at https://paper.dropbox.com/doc/analytics-node-E2E-Test-9oavh3DFcFBXuqCJBe1o9.
  test('end to end test', async t => {
    const id = uid(16)

    // Segment Write Key for https://segment.com/segment-libraries/sources/analytics_node_e2e_test/overview.
    // This source is configured to send events to a Runscope bucket used by this test.
    const analytics = new Analytics('wZqHyttfRO0KxEHyRTujWZQswgTDZx1N')
    analytics.track({
      userId: 'prateek',
      event: 'E2E Test',
      properties: { id }
    })
    analytics.flush()

    // Give some time for events to be delivered from the API to destinations.
    await delay(5 * 1000) // 5 seconds.

    const axiosClient = axios.create({
      baseURL: 'https://api.runscope.com',
      timeout: 10 * 1000,
      headers: { Authorization: `Bearer ${process.env.RUNSCOPE_TOKEN}` }
    })
    retries(axiosClient, { retries: 3 })

    // Runscope Bucket for https://www.runscope.com/stream/zfte7jmy76oz.
    const messagesResponse = await axiosClient.get('buckets/zfte7jmy76oz/messages?count=10')
    t.is(messagesResponse.status, 200)

    const requests = messagesResponse.data.data.map(async item => {
      const response = await axiosClient.get(`buckets/zfte7jmy76oz/messages/${item.uuid}`)
      t.is(response.status, 200)
      return JSON.parse(response.data.data.request.body)
    })

    const messages = await Promise.all(requests)

    const message = messages.find(message => message.properties.id === id)
    t.truthy(message)
  })
}
