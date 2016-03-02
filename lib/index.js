var assert = require('assert');
var clone = require('clone');
var debug = require('debug')('analytics-node');
var noop = function(){};
var request = require('superagent');
require('superagent-retry')(request);
var type = require('component-type');
var join = require('join-component');
var uid = require('crypto-token');
var version = require('../package.json').version;
var extend = require('lodash').extend;

global.setImmediate = global.setImmediate || process.nextTick.bind(process);

/**
 * Expose an `Analytics` client.
 */

module.exports = Analytics;

/**
 * Initialize a new `Analytics` with your Segment project's `writeKey` and an
 * optional dictionary of `options`.
 *
 * @param {String} writeKey
 * @param {Object} options (optional)
 *   @property {Number} flushAt (default: 20)
 *   @property {Number} flushAfter (default: 10000)
 *   @property {String} host (default: 'https://api.segment.io')
 */

function Analytics(writeKey, options){
  if (!(this instanceof Analytics)) return new Analytics(writeKey, options);
  assert(writeKey, 'You must pass your Segment project\'s write key.');
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
  this.enqueue('identify', message, fn);
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
  this.enqueue('group', message, fn);
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
  this.enqueue('track', message, fn);
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
  this.enqueue('page', message, fn);
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
  this.enqueue('alias', message, fn);
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

  var data = {
    batch: batch,
    timestamp: new Date(),
    sentAt: new Date()
  };

  debug('flush: %o', data);

  var req = request
    .post(this.host + '/v1/batch')
    .auth(this.writeKey, '')
    .retry(3)
    .send(data)
    .end(function(err, res){
      err = err || error(res);
      fns.push(fn);
      fns.forEach(function(fn){ fn(err, data); });
      debug('flushed: %o', data);
    });
};

/**
 * Add a `message` of type `type` to the queue and check whether it should be
 * flushed.
 *
 * @param {String} type
 * @param {Object} message
 * @param {Functino} fn (optional)
 * @api private
 */

Analytics.prototype.enqueue = function(type, message, fn){
  fn = fn || noop;
  message = clone(message);
  message.type = type;
  message.context = extend(message.context || {}, { library: { name: 'analytics-node', version: version }});
  if (!message.timestamp) message.timestamp = new Date();
  if (!message.messageId) message.messageId = 'node-' + uid(32);

  debug('%s: %o', type, message);
  this.queue.push({
    message: message,
    callback: fn
  });

  if (this.queue.length >= this.flushAt) this.flush();
  if (this.timer) clearTimeout(this.timer);
  if (this.flushAfter) this.timer = setTimeout(this.flush.bind(this), this.flushAfter);
};

/**
 * Validation rules.
 */

var rules = {
  anonymousId: ['string', 'number'],
  category: 'string',
  context: 'object',
  event: 'string',
  groupId: ['string', 'number'],
  integrations: 'object',
  name: 'string',
  previousId: ['string', 'number'],
  timestamp: 'date',
  userId: ['string', 'number']
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
    if (!val) continue;
    var exp = rules[key];
    exp = ('array' === type(exp) ? exp : [exp]);
    var a = 'object' == exp ? 'an' : 'a';
    assert(exp.some(function(e){ return type(val) === e; }), '"' + key + '" must be ' + a + ' ' + join(exp, 'or') + '.');
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
