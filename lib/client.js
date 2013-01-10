var _           = require('underscore'),
    events      = require('events'),
    util        = require('util'),
    requests    = require('request'),
    triggers    = require('./triggers');

var defaults = {

  /**
   * Uses this host to send messages to
   * @type {String}
   */
  host            : 'https://api2.segment.io',

  /**
   * URL endpoints (including version)
   * @type {Object}
   */
  endpoints : {
      identify    : '/v1/identify',
      track       : '/v1/track',
      batch       : '/v1/import'
  },

  //
  /// Trigger Options
  //

  /**
   * Flush after this many messages are in the queue
   * @type {Number}
   */
  flushAt         : 50,
  /**
   * Flush after this many milliseconds have passed since the
   * last flush
   * @type {Number}
   */
  flushAfter      : 7500,

  //
  /// Send Options
  //

  /**
   * Stop accepting messages into the queue after this many messages
   * havent been flushed
   * @type {Number}
   */
  maxQueueSize    : 10000,
  /**
   * Check to flush after this many milliseconds
   * @type {Number}
   */
  timerInterval   : 10000,

  /**
   * The triggers to use to decide to flush
   * @type {Array}
   */
  triggers: [triggers.size, triggers.time]
};


/**
 * Batching Segment.io node client driver
 *
 * @param  {Object} options
 *   @param  {String} apiKey        - Segment.io api key
 *   @option {String} host          - api base hostname
 *   @option {Number} flushAt     - size of queue before flush
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

  if (options) this.init(options);
};

util.inherits(Client, events.EventEmitter);


/**
 * Initializes this client.
 *
 * @param  {Object} options
 *   @param  {String} apiKey        - Segment.io api key
 *   @option {String} host          - api base hostname
 *   @option {Number} flushAt     - size of queue before flush
 *   @option {Number} maxQueueSize  - max size of queue to grow
 *   @option {Object} endpoints     - endpoints to make calls to
 *   @option {Number} timerInterval - time in ms between checks to upload
 *   @option {Array}  triggers      - series of functions to test saving
 *                                    [function () { returns {Boolean}; }]
 */
Client.prototype.init = function (options) {

  if (!_.isString(options.apiKey) || options.apiKey.length === 0)
      throw new Error('analytics-node client must be initialized with a '+
                      'non-empty apiKey.');

  this.apiKey      = options.apiKey;
  this.options     = _.defaults(options || {}, defaults);

  this.lastFlush = new Date(0);
  this.queue = [];

  this.initialized = true;

  this.emit('initialized');
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
 * You must pass in at least one of the userId or sessionId, so that the
 * user can be properly identified.
 *
 * @param  {Object} options
 *   @param  {String}  sessionId - anonymous user's session id (optional)
 *   @param  {String}  userId    - id for logged in user (needs sessionId if not provided)
 *   @param  {Object}  traits    - key/value object of tags for the user (optional)
 *   @option {Date}    timestamp - the Date object representing when the identify occurred
 *   @param  {Object}  context   - app provided context about the user (optional)
   *   @option  {String}  ip
   *   @option  {String}  userAgent
 *
 * @return {events.EventEmitter} Promise event emitter that emits 'flushed' once
 * the message has been flushed, and 'err' when an error has occured.
 *
 */
Client.prototype.identify = function (options) {

  this._checkInitialized();

  if (!_.isObject(options)) {
      throw new Error('[analytics]#identify: identify must be an object');
  }

  var sessionId = options.sessionId,
      userId    = options.userId,
      traits    = options.traits || {},
      context   = options.context || {},
      timestamp = options.timestamp;

  if (sessionId && !_.isString(sessionId))
      throw new Error('[analytics]#identify: options.sessionId must be a string.');

  if (userId && !_.isString(userId))
      throw new Error('[analytics]#identify: options.userId must be a string.');

  if (!_.isString(sessionId) && !_.isString(userId))
      throw new Error('[analytics]#identify: either options.sessionId or options.userId ' +
                      'must be provided as a non-empty string.');

  if (timestamp && !_.isDate(timestamp))
      throw new Error('[analytics]#identify: options.timestamp ' +
                      'must be provided as a date.');

  if (context && !_.isObject(context))
      throw new Error('[analytics]#identify: options.context ' +
                      'must be an object.');

  var promise = new events.EventEmitter();

  var message = {

      action    : 'identify',
      sessionId : sessionId,
      userId    : userId,
      traits    : traits,
      context   : context,

      promise   : promise
  };

  if (timestamp) message.timestamp = timestamp.toISOString();

  this._enqueue(message);

  return promise;
};


/**
 * Whenever a user triggers an event, you’ll want to track it.
 *
 * @param {Object} options
 *   @param {String}  sessionId  - id for the user's session (must supply either this or userId)
 *   @param {String}  userId     - id for the actual user (must supply either this or sessionId)
 *   @param {String}  event      - name of the event by the user i.e. "Booked a listing"
 *   @param {Object}  properties - key/value tags for the event. (optional)
 *   @param {Date}    timestamp  - the Date object representing when the track occurred
 *   @param {Object}  context    - app provided context about the user (optional)
   *   @option  {String}  ip
   *   @option  {String}  userAgent
   *
 * @return {events.EventEmitter} Promise event emitter that emits 'flushed' once
 * the message has been flushed, and 'err' when an error has occured.
   *
 */
Client.prototype.track = function (options) {

  this._checkInitialized();

  if (!_.isObject(options)) {
      throw new Error('[analytics]#track: options must be an object');
  }

  var sessionId   = options.sessionId,
      userId      = options.userId,
      event       = options.event,
      properties  = options.properties || {},
      context     = options.context || {},
      timestamp   = options.timestamp;


  if (sessionId && !_.isString(sessionId))
      throw new Error('[analytics]#track: options.sessionId must be a string.');

  if (userId && !_.isString(userId))
      throw new Error('[analytics]#track: options.userId must be a string.');

  if (!_.isString(sessionId) && !_.isString(userId))
      throw new Error('[analytics]#track: either options.sessionId or options.userId must be provided as a non-empty string.');

  if (!_.isString(event))
      throw new Error('[analytics]#track: options.event must be a non-empty string.');

  if (timestamp && !_.isDate(timestamp))
      throw new Error('[analytics]#track: options.timestamp ' +
                      'must be provided as a date.');

  if (context && !_.isObject(context))
      throw new Error('[analytics]#context: options.context ' +
                      'must be an object.');

  var promise = new events.EventEmitter();

  var message = {

      action     : 'track',
      sessionId  : sessionId,
      userId     : userId,
      event      : event,
      properties : properties || {},

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

  var self = this;

  if (this.queue.length >= this.options.maxQueueSize) {
      // dropping this packet because the queue is full
      // to conserve memory
      this.emit('err',
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

    if (this.queue.length > 0) {

    this.emit('flushing');

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
        apiKey      : this.apiKey,
        batch       : batch
      }
    };

    var done = function (err) {

      if (err)
          self.emit('err', err);
      else
          self.emit('flushed');

      _.each(promises, function (promise) {
        if (err) promise.emit('err', err);
        else promise.emit('flushed');
      });

      if (callback) callback(err);
    };

    requests.post(request, function (err, response, body) {

      if (err)
        return done(err);
      else if (response.statusCode !== 200)
        return done(new Error((body && body.message) ||
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


