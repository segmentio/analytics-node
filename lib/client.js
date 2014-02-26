
var assert = require('assert');
var defaults = require('./defaults');
var def = require('defaults');
var Emitter = require('events').EventEmitter;
var inherit = require('util').inherits;
var noop = function(){};
var requests = require('request');
var triggers = require('./triggers');
var type = require('component-type');

/**
 * Expose `Client`.
 */

module.exports = Client;

/**
 * Initialize a new `Client` with `options`.
 *
 * @param {Object} options
 *   @property {String} secret
 *   @property {String} host
 *   @property {Number} flushAt
 *   @property {Number} maxQueueSize
 *   @property {Object} endpoints
 *   @property {Number} timerInterval
 *   @property {Array} triggers
 */

function Client(options){
  this.initialized = false;
  this.lastFlush = null;
  this.queue = [];
  this.on('error', function () {});
  if (options) this.init(options);
}

/**
 * Inherit from `Emitter`.
 */

inherit(Client, Emitter);

/**
 * Initialize the client with `options`.
 *
 * @param {Object} options
 *   @property {String} secret
 *   @property {String} host
 *   @property {Number} flushAt
 *   @property {Number} maxQueueSize
 *   @property {Object} endpoints
 *   @property {Number} timerInterval
 *   @property {Array} triggers
 */

Client.prototype.init = function(options){
  assert(options.secret, 'client must be initialized with a secret');
  this.secret = options.secret;
  this.options = def(options || {}, defaults);
  this.lastFlush = new Date(0);
  this.queue = [];
  this.initialized = true;
  this.emit('initialize');
};

/**
 * Identify with `opts`.
 *
 * @param {Object} opts
 *   @property {String} userId
 *   @property {Object} traits (optional)
 *   @property {Object} context (optional)
 *   @property {Date} timestamp (optional)
 * @return {EventEmitter}
 */

Client.prototype.identify = function(opts){
  this._checkInitialized();
  validate(opts);
  assert(opts.userId, 'must pass a userId string');

  var emitter = new Emitter;
  var message = {
    action: 'identify',
    userId: opts.id,
    traits: opts.traits || {},
    context: ctx(opts.context),
    promise: emitter
  };

  if (opts.timestamp) message.timestamp = opts.timestamp.toISOString();

  this._enqueue(message);
  return emitter;
};

/**
 * Group with `opts`.
 *
 * @param {Object} opts
 *   @property {String} userId
 *   @property {String} sessionId
 *   @property {String} groupId
 *   @property {Object} traits (optional)
 *   @property {Object} context (optional)
 *   @property {Date} timestamp (optional)
 * @return {EventEmitter}
 */

Client.prototype.group = function(opts){
  this._checkInitialized();
  validate(opts);
  assert(opts.groupId, 'must pass a groupId string');
  assert(opts.userId || opts.sessionId, 'must pass either a sessionId or userId');

  var emitter = new Emitter;
  var message = {
    action: 'group',
    groupId: opts.groupId,
    traits: opts.traits || {},
    context: ctx(opts.context),
    promise: emitter
  };

  if (opts.userId) message.userId = opts.userId;
  if (opts.sessionId) message.sessionId = opts.sessionId;
  if (opts.timestamp) message.timestamp = opts.timestamp.toISOString();

  this._enqueue(message);
  return emitter;
};

/**
 * Track with `opts`.
 *
 * @param {Object} opts
 *   @property {String} userId
 *   @property {String} event
 *   @property {Object} properties (optional)
 *   @property {Date} timestamp (optional)
 *   @property {Object} context (optional)
 * @return {EventEmitter}
 */

Client.prototype.track = function (opts) {
  this._checkInitialized();
  validate(opts);
  assert(opts.userId, 'must pass a userId');
  assert(opts.event, 'must pass an event name');

  var emitter = new Emitter;
  var message = {
    action: 'track',
    userId: opts.userId,
    event: opts.event,
    properties: opts.properties || {},
    context: ctx(opts.context),
    promise: emitter
  };

  if (opts.timestamp) message.timestamp = opts.timestamp.toISOString();

  this._enqueue(message);
  return emitter;
};


/**
 * Alias with `opts`.
 *
 * @param {Object} opts
 *   @property {String} from
 *   @property {String} to
 *   @property {Date} timestamp
 *   @property {Object} context
 * @return {EventEmitter}
 */

Client.prototype.alias = function (opts) {
  this._checkInitialized();
  validate(opts);
  assert(opts.from, 'must pass a from id');
  assert(opts.to, 'must pass a to id');

  var emitter = new Emitter;
  var message = {
    action: 'alias',
    from: opts.from,
    to: opts.to,
    context: ctx(opts.context),
    promise: emitter
  };

  if (opts.timestamp) message.timestamp = opts.timestamp.toISOString();

  this._enqueue(message);
  return emitter;
};

/**
 * Add a message to the internal queue.
 *
 * @param {Object} message
 * @api private
 */

Client.prototype._enqueue = function(message){
  // test mode, emit but don't enqueue
  if (!this.options.send) {
    process.nextTick(function () {
      message.promise.emit('flush');
    });
    return;
  }

  if (this.queue.length >= this.options.maxQueueSize) {
    this.emit('error', new Error('failed to enqueue message because the queue is full'));
  } else {
    this.queue.push(message);
    this._setTimer();
  }

  this._checkFlush();
};

/**
 * Flush the queue if necessary.
 */

Client.prototype._checkFlush = function(){
  for (var key in triggers) {
    if (triggers[key](this)) return this.flush();
  }
};

/**
 * Start the flush-check timer.
 */

Client.prototype._setTimer = function () {
  var self = this;
  if (this.timer) return;
  this.timer = setInterval(function () {
    self._checkFlush();
  }, this.options.timerInterval);
};

/**
 * Clear the flush-check timer.
 */

Client.prototype._clearTimer = function () {
  if (!this.timer) return;
  clearInterval(this.timer);
  delete this.timer;
};

/**
 * Flush the current queue.
 *
 * @param {Function} fn
 */

Client.prototype.flush = function(fn) {
  this._checkInitialized();
  fn = fn || noop;
  if (!this.queue.length) return fn();

  var self = this;
  var batch = this.queue.splice(0, this.options.flushAt);
  var url = this.options.host + this.options.endpoints.batch;

  var promises = batch.map(function(item){
    var promise = item.promise;
    delete item.promise;
    return promise;
  });

  var request = {
    url: url,
    json: {
      secret: this.secret,
      batch: batch
    }
  };

  function done(err){
    if (err) {
      self.emit('error', err)
    } else {
      self.emit('flush');
    }

    promises.forEach(function(promise){
      if (!err) return promise.emit('flush');
      if (promise.listeners('error').length > 0) promise.emit('error', err);
    });

    fn(err);
  };

  requests.post(request, function(err, res, body){
    if (err) return done(err);
    if (res.statusCode == 200) return done();
    done(new Error((body && body.error && body.error.message) || 'Server error: ' + JSON.stringify(body)));
  });

  this.lastFlush = new Date();
  if (!this.queue.length) this._clearTimer();
};

/**
 * Check whether the client has been initialized.
 *
 * @api private
 */

Client.prototype._checkInitialized = function(){
  assert(this.initialized, 'client has not been initialized yet. call client.init(options)');
};

/**
 * Validation rules.
 */

var rules = {
  context: 'object',
  event: 'string',
  groupId: 'string',
  sessionId: 'string',
  timestamp: 'date',
  userId: 'string'
};

/**
 * Validate an options `obj`.
 *
 * @param {Object} obj
 */

function validate(obj){
  assert('object' == type(obj), 'must pass an options object');
  for (var key in rules) {
    var expected = rules[key];
    if (obj[key]) assert(expected == type(obj[key]), key + ' must be a ' + expected);
  }
};

/**
 * Extend a `context` object with library-specific properties.
 *
 * @param {Object} context
 * @return {Object}
 */

function ctx(context){
  context = context || {};
  context.library = 'analytics-node';
  return context;
}