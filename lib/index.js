
var assert = require('assert');
var debug = require('debug')('analytics-node');
var noop = function(){};
var request = require('superagent');
var type = require('component-type');
var version = require('../package.json').version;

/**
 * Expose an `Analytics` client.
 */

module.exports = Analytics;

/**
 * Initialize a new `Analytics` with your Segment.io project's `writeKey` and
 * an optional dictionary of `options`.
 *
 * @param {String} writeKey
 * @param {Object} options (optional)
 */

function Analytics(writeKey, options){
  if (!(this instanceof Analytics)) return new Analytics(writeKey, options);
  assert(writeKey, 'You must pass your Segment.io project\'s write key.');
  options = options || {};
  this.queue = [];
  this.writeKey = writeKey;
  this.host = options.host || 'https://api.segment.io';
  this.flushAt = Math.max(options.flushAt, 1) || 20;
  this.flushAfter = options.flushAfter || 10000;
}

/**
 * Send an identify `message`.
 *
 * @param {Object} message
 * @param {Function} fn (optional)
 * @return {Analytics}
 */

Analytics.prototype.identify = function(message, fn){
  validate(message);
  assert(message.anonymousId || message.userId, 'You must pass either an "anonymousId" or a "userId".');
  message.action = 'identify';
  debug('identify: %o', message);
  this.enqueue(message, fn);
  return this;
};

/**
 * Send a group `message`.
 *
 * @param {Object} message
 * @param {Function} fn (optional)
 * @return {Analytics}
 */

Analytics.prototype.group = function(message, fn){
  validate(message);
  assert(message.anonymousId || message.userId, 'You must pass either an "anonymousId" or a "userId".');
  assert(message.groupId, 'You must pass a "groupId".');
  message.action = 'group';
  debug('group: %o', message);
  this.enqueue(message, fn);
  return this;
};

/**
 * Send a track `message`.
 *
 * @param {Object} message
 * @param {Function} fn (optional)
 * @return {Analytics}
 */

Analytics.prototype.track = function(message, fn){
  validate(message);
  assert(message.anonymousId || message.userId, 'You must pass either an "anonymousId" or a "userId".');
  assert(message.event, 'You must pass an "event".');
  message.action = 'track';
  debug('track: %o', message);
  this.enqueue(message, fn);
  return this;
};

/**
 * Send a page `message`.
 *
 * @param {Object} message
 * @param {Function} fn (optional)
 * @return {Analytics}
 */

Analytics.prototype.page = function(message, fn){
  validate(message);
  assert(message.anonymousId || message.userId, 'You must pass either an "anonymousId" or a "userId".');
  message.action = 'page';
  debug('page: %o', message);
  this.enqueue(message, fn);
  return this;
};

/**
 * Send an alias `message`.
 *
 * @param {Object} message
 * @param {Function} fn (optional)
 * @return {Analytics}
 */

Analytics.prototype.alias = function(message, fn){
  validate(message);
  assert(message.userId, 'You must pass a "userId".');
  assert(message.previousId, 'You must pass a "previousId".');
  message.action = 'alias';
  debug('alias: %o', message);
  this.enqueue(message, fn);
  return this;
};

/**
 * Flush the current queue and callback `fn(err, batch)`.
 *
 * @param {Function} fn (optional)
 * @return {Analytics}
 */

Analytics.prototype.flush = function(fn){
  fn = fn || noop;
  if (!this.queue.length) return setImmediate(fn);

  var items = this.queue.splice(0, this.flushAt);
  var fns = items.map(function(_){ return _.callback; });
  var batch = items.map(function(_){ return _.message; });
  var context = { library: { name: 'analytics-node', version: version }};
  var data = {
    batch: batch,
    context: context
  };

  debug('flush: %o', data);
  request
    .post(this.host + '/v1/batch')
    .auth(this.writeKey, '')
    .send(data)
    .end(function(err, res){
      err = err || error(res);
      fns.push(fn);
      fns.forEach(function(fn){ fn(err, data); });
      debug('flushed: %o', data);
    });
};

/**
 * Add a `message` to the queue and check if it should be flushed.
 *
 * @param {Object} message
 * @param {Functino} fn (optional)
 * @api private
 */

Analytics.prototype.enqueue = function(message, fn){
  fn = fn || noop;
  this.queue.push({ message: message, callback: fn });
  if (this.queue.length >= this.flushAt) this.flush();
  if (this.timer) clearTimeout(this.timer);
  if (this.flushAfter) this.timer = setTimeout(this.flush.bind(this), this.flushAfter);
};

/**
 * Validation rules.
 */

var rules = {
  anonymousId: 'string',
  category: 'string',
  context: 'object',
  event: 'string',
  groupId: 'string',
  integrations: 'object',
  name: 'string',
  previousId: 'string',
  timestamp: 'date',
  userId: 'string'
};

/**
 * Validate an options `obj`.
 *
 * @param {Object} obj
 */

function validate(obj){
  assert('object' == type(obj), 'You must pass a message object.');
  for (var key in rules) {
    var val = obj[key];
    var exp = rules[key];
    var a = 'object' == exp ? 'an' : 'a';
    if (val) assert(exp == type(val), '"' + key + '" must be ' + a + ' ' + exp + '.');
  }
};

/**
 * Get an error from a `res`.
 *
 * @param {Object} res
 * @return {String}
 */

function error(res){
  if (!res.error) return;
  var body = res.body;
  var msg = body.error && body.error.message
    || res.status + ' ' + res.text;
  return new Error(msg);
}