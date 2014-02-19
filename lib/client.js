var _           = require('underscore'),
    events      = require('events'),
    util        = require('util'),
    requests    = require('request'),
    defaults    = require('./defaults'),
    triggers    = require('./triggers');


/**
 * Batching Segment.io node client driver
 *
 * @param  {Object} options
 *   @param  {String} secret        - Segment.io project "secret" (available
 *                                    in your project's settings)
 *   @option {String} host          - api base hostname
 *   @option {Number} flushAt       - size of queue before flush
 *   @option {Number} maxQueueSize  - max size of queue to grow
 *   @option {Object} endpoints     - endpoints to make calls to
 *   @option {Number} timerInterval - time in ms between checks to upload
 *   @option {Array}  triggers      - series of functions to test saving
 *                                    [function () { returns {Boolean}; }]
 */
var Client = module.exports = function (options) {

  this.initialized = false;
  this.lastFlush = null;
  this.queue = [];

  // No-op on error so we don't kill the server.
  this.on('error', function () {});

  if (options) this.init(options);
};

util.inherits(Client, events.EventEmitter);


/**
 * Initializes this client.
 *
 * @param  {Object} options
 *   @param  {String} secret        - Segment.io project "secret" (available
 *                                    in your project's settings)
 *   @option {String} host          - api base hostname
 *   @option {Number} flushAt     - size of queue before flush
 *   @option {Number} maxQueueSize  - max size of queue to grow
 *   @option {Object} endpoints     - endpoints to make calls to
 *   @option {Number} timerInterval - time in ms between checks to upload
 *   @option {Array}  triggers      - series of functions to test saving
 *                                    [function () { returns {Boolean}; }]
 */
Client.prototype.init = function (options) {

  if (!_.isString(options.secret) || options.secret.length === 0)
      throw new Error('analytics-node client must be initialized with a '+
                      'non-empty API "secret" parameter.');

  this.secret      = options.secret;
  this.options     = _.defaults(options || {}, defaults);

  this.lastFlush = new Date(0);
  this.queue = [];

  this.initialized = true;

  this.emit('initialize');
};


/**
 * Internal method to check whether the client has been initialized.
 * @private
 */
Client.prototype._checkInitialized = function () {
  if (!this.initialized)
    throw new Error('analytics-node client is not initialized. Please call ' +
                    'client.init(options).');
};


/**
 * Identifying a user ties all of their actions to an ID, and associates
 * user `traits` to that ID.
 *
 *
 * @param  {Object} options
 *   @param  {String}  userId    - id for logged in user
 *   @param  {Object}  traits    - key/value object of tags for the user (optional)
 *   @option {Date}    timestamp - the Date object representing when the identify occurred
 *   @param  {Object}  context   - app provided context about the user (optional)
   *   @option  {String}  ip
   *   @option  {String}  userAgent
 *
 * @return {events.EventEmitter} Promise event emitter that emits 'flush' once
 * the message has been flushed, and 'error' when an error has occured.
 *
 */
Client.prototype.identify = function (options) {

  this._checkInitialized();

  if (!_.isObject(options)) {
      throw new Error('[analytics]#identify: identify must be an object');
  }

  var userId    = options.userId,
      traits    = options.traits || {},
      context   = options.context || {},
      timestamp = options.timestamp;

  if (!_.isString(userId))
      throw new Error('[analytics]#identify: options.userId is a required string.');

  if (timestamp && !_.isDate(timestamp))
      throw new Error('[analytics]#identify: options.timestamp ' +
                      'must be provided as a date.');

  if (context && !_.isObject(context))
      throw new Error('[analytics]#identify: options.context ' +
                      'must be an object.');

  var promise = new events.EventEmitter();

  var message = {

      action    : 'identify',
      userId    : userId,
      traits    : traits,
      context   : _.extend(context, {library: 'analytics-node'}),

      promise   : promise
  };

  if (timestamp) message.timestamp = timestamp.toISOString();

  this._enqueue(message);

  return promise;
};

/**
 * Identify a group.
 *
 * @param {Object} options
 */

Client.prototype.group = function(options){
  this._checkInitialized();

  if (!_.isObject(options)) throw new TypeError('[analytics]#group: group must be an object');
  if (!options.groupId) throw new Error('[analytics]#group: options.groupId is required');
  if (!(options.userId || options.sessionId)) throw new Error('[analytics]#group: .userId or .sessionId is required');

  if (options.timestamp && !_.isDate(options.timestamp)) {
    throw new Error('[analytics]#group: .timestamp must be provided as a date');
  }

  var groupId = options.groupId;
  var userId = options.userId;
  var sessionId = options.sessionId;
  var traits = options.traits || {};
  var context = options.context || {};
  var timestamp = options.timestamp;
  var emitter = new events.EventEmitter;

  var message = {
    action: 'group',
    groupId: groupId,
    traits: traits,
    context: _.extend(context, { library: 'analytics-node' }),
    promise: emitter
  };

  if (userId) message.userId = userId;
  if (sessionId) message.sessionId = sessionId;
  if (timestamp) message.timestamp = timestamp.toISOString();

  this._enqueue(message);
  return emitter;
};

/**
 * Whenever a user triggers an event, you’ll want to track it.
 *
 * @param {Object} options
 *   @param {String}  userId     - id for the actual user
 *   @param {String}  event      - name of the event by the user i.e. "Booked a listing"
 *   @param {Object}  properties - key/value tags for the event. (optional)
 *   @param {Date}    timestamp  - the Date object representing when the track occurred
 *   @param {Object}  context    - app provided context about the user (optional)
   *   @option  {String}  ip
   *   @option  {String}  userAgent
   *
 * @return {events.EventEmitter} Promise event emitter that emits 'flush' once
 * the message has been flushed, and 'error' when an error has occured.
   *
 */
Client.prototype.track = function (options) {

  this._checkInitialized();

  if (!_.isObject(options)) {
      throw new Error('[analytics]#track: options must be an object');
  }

  var userId      = options.userId,
      event       = options.event,
      properties  = options.properties || {},
      context     = options.context || {},
      timestamp   = options.timestamp;


  if (!_.isString(userId))
      throw new Error('[analytics]#track: options.userId is a required string.');

  if (!_.isString(event))
      throw new Error('[analytics]#track: options.event must be a non-empty string.');

  if (timestamp && !_.isDate(timestamp))
      throw new Error('[analytics]#track: options.timestamp ' +
                      'must be provided as a date.');

  if (context && !_.isObject(context))
      throw new Error('[analytics]#track: options.context ' +
                      'must be an object.');

  var promise = new events.EventEmitter();

  var message = {

      action     : 'track',
      userId     : userId,
      event      : event,
      properties : properties || {},
      context    : _.extend(context, {library: 'analytics-node'}),
      promise    : promise
  };

  if (timestamp) message.timestamp = timestamp.toISOString();

  this._enqueue(message);

  return promise;
};


/**
 * Aliases an anonymous user into an identified user.
 *
 * @param {Object} options
 *   @param {String}  from       - the anonymous user's id before they are logged in
 *   @param {String}  to         - the identified user's id after they're logged in
 *   @param {Date}    timestamp  - the Date object representing when the alias occurred
 *   @param {Object}  context    - app provided context (optional)
 * @return {events.EventEmitter} Promise event emitter that emits 'flush' once
 * the message has been flushed, and 'error' when an error has occured.
   *
 */
Client.prototype.alias = function (options) {

  this._checkInitialized();

  if (!_.isObject(options)) {
      throw new Error('[analytics]#alias: options must be an object');
  }

  var to          = options.to,
      from        = options.from,
      context     = options.context || {},
      timestamp   = options.timestamp;


  if (!_.isString(from))
      throw new Error('[analytics]#alias: options.from is a required string.');

  if (!_.isString(to))
      throw new Error('[analytics]#alias: options.to must be a non-empty string.');

  if (timestamp && !_.isDate(timestamp))
      throw new Error('[analytics]#alias: options.timestamp ' +
                      'must be provided as a date.');

  if (context && !_.isObject(context))
      throw new Error('[analytics]#alias: options.context ' +
                      'must be an object.');

  var promise = new events.EventEmitter();
  promise.on('error', function(){});

  var message = {

      action     : 'alias',
      from       : from,
      to         : to,
      context    : _.extend(context, {library: 'analytics-node'}),
      promise    : promise
  };

  if (timestamp) message.timestamp = timestamp.toISOString();

  this._enqueue(message);

  return promise;
};

/**
 * Enqueues a message into the internal queue.
 * @param  {Object} message Message to send to the server
 */
Client.prototype._enqueue = function (message) {

  if (!this.options.send) {
    // we're in test mode
    // on next tick, we'll emit the promise
    process.nextTick(function () {
      message.promise.emit('flush');
    });
    // don't actually enqueue
    return;
  }

  var self = this;

  if (this.queue.length >= this.options.maxQueueSize) {
      // dropping this packet because the queue is full
      // to conserve memory
      this.emit('error',
                new Error('analytics-node client failed to enqueue message ' +
                          'because queue is full. Consider increasing queue ' +
                          'size.'));
  } else {

    this.queue.push(message);
    this._setTimer();
  }

  this._checkFlush();
};


/**
 * Checks whether its time to flush the queue, and triggers
 * the flush if its necessary.
 */
Client.prototype._checkFlush = function () {

  var shouldFlush = false,
      self = this;

  _.each(this.options.triggers, function (trigger) {

      if (_.isFunction(trigger))
          shouldFlush = shouldFlush || trigger.apply(self);
  });

  if (shouldFlush)
      this.flush();
};

/**
 * Starts the flush-check timer.
 */
Client.prototype._setTimer = function () {

  var self = this;

  if (!this.timer) {

      this.timer = setInterval(function () {

          self._checkFlush.apply(self);

      }, this.options.timerInterval);
  }
};


/**
 * Clears the flush-check timer.
 */
Client.prototype._clearTimer = function () {

  if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
  }
};

/**
 * Flushes the current queue
 */
Client.prototype.flush = function(callback) {

  this._checkInitialized();

  var self = this;

  if (this.queue.length === 0) {
    // there is nothing in the queue
    if (callback) callback();

  } else {
    // we have something to send
    //
    var batch  = this.queue.splice(0, this.options.flushAt);

    // gets and removes the promises from the item
    var promises = _.map(batch, function (item) {
      var promise = item.promise;
      delete item.promise;
      return promise;
    });

    var url = this.options.host + this.options.endpoints.batch;

    var request = {
      url: url,
      json: {
        secret      : this.secret,
        batch       : batch
      }
    };

    var done = function (err) {

      if (err)
          self.emit('error', err);
      else
          self.emit('flush');

      _.each(promises, function (promise) {
        if (err) {
          // Check for listeners so there is no uncaught exception.
          if (promise.listeners('error').length > 0) promise.emit('error', err);
        } else {
          promise.emit('flush');
        }
      });

      if (callback) callback(err);
    };

    requests.post(request, function (err, response, body) {

      if (err)
        return done(err);
      else if (response.statusCode !== 200)
        return done(new Error((body && body.error && body.error.message) ||
                              'Server error: ' + JSON.stringify(body)));
      else
        return done();
    });

    this.lastFlush = new Date();
    // If the queue is empty, do not look for more events.
    if (this.queue.length === 0) {
        this._clearTimer();
    }
  }
};


