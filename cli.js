#!/usr/bin/env node
'use strict'

const assert = require('assert')
const program = require('commander')
const Analytics = require('.')
const pkg = require('./package')

const run = (method, options) => {
  const writeKey = process.env.SEGMENT_WRITE_KEY || program.writeKey
  assert(writeKey, 'You need to define your write key via the $SEGMENT_WRITE_KEY environment variable or the --write-key flag.')

  const analytics = new Analytics(writeKey, { flushAt: 1 })
  analytics[method](options, err => {
    if (err) {
      console.error(err.stack)
      process.exit(1)
    }
  })
}

const toDate = str => new Date(str)
const toObject = str => JSON.parse(str)

program
  .version(pkg.version)
  .option('-w, --write-key <key>', 'the segment write key to use')

program
  .command('track <event>')
  .description('track a user event')
  .option('-u, --user <id>', 'the user id to send the event as')
  .option('-a, --anonymous <id>', 'the anonymous user id to send the event as')
  .option('-p, --properties <data>', 'the event properties to send (JSON-encoded)', toObject)
  .option('-t, --timestamp <date>', 'the date of the event', toDate)
  .option('-c, --context <data>', 'additional context for the event (JSON-encoded)', toObject)
  .action((event, options) => {
    run('track', {
      event,
      userId: options.user,
      anonymousId: options.anonymous,
      properties: options.properties,
      timestamp: options.timestamp,
      context: options.context
    })
  })

program
  .command('page')
  .description('track a page view')
  .option('-u, --user <id>', 'the user id to send the event as')
  .option('-n, --name <name>', 'the name of the page')
  .option('-C, --category <category>', 'the category of the page')
  .option('-p, --properties <data>', 'attributes of the page (JSON-encoded)', toObject)
  .option('-t, --timestamp <date>', 'the date of the event', toDate)
  .option('-c, --context <data>', 'additional context for the event (JSON-encoded)', toObject)
  .action(options => {
    run('page', {
      userId: options.user,
      name: options.name,
      category: options.category,
      properties: options.properties,
      timestamp: options.timestamp,
      context: options.context
    })
  })

program
  .command('identify')
  .description('identify a user')
  .option('-u, --user <id>', 'the user id to send the event as')
  .option('-T, --traits <data>', 'the user traits to send (JSON-encoded)', toObject)
  .option('-t, --timestamp <date>', 'the date of the event', toDate)
  .option('-c, --context <data>', 'additional context for the event (JSON-encoded)', toObject)
  .action(options => {
    run('identify', {
      userId: options.user,
      traits: options.traits,
      timestamp: options.timestamp,
      context: options.context
    })
  })

program
  .command('group')
  .description('identify a group of users')
  .option('-u, --user <id>', 'the user id to send the event as')
  .option('-a, --anonymous <id>', 'the anonymous id to associate with this group')
  .option('-g, --group <id>', 'the group id to associate this user with')
  .option('-T, --traits <data>', 'attributes about the group (JSON-encoded)', toObject)
  .option('-t, --timestamp <date>', 'the date of the event', toDate)
  .option('-c, --context <data>', 'additional context for the event (JSON-encoded)', toObject)
  .action(options => {
    run('group', {
      userId: options.user,
      anonymousId: options.anonymous,
      groupId: options.group,
      traits: options.traits,
      timestamp: options.timestamp,
      context: options.context
    })
  })

program
  .command('alias')
  .description('remap a user to a new id')
  .option('-u, --user <id>', 'the user id to send the event as')
  .option('-p, --previous <id>', 'the previous user id (to add the alias for)')
  .action(options => {
    run('alias', {
      userId: options.user,
      previousId: options.previous
    })
  })

program.parse(process.argv)

if (program.args.length === 0) {
  program.help()
}
