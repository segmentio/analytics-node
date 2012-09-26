
var _           = require('underscore'),
    events      = require('events'),
    util        = require('util'),
    request     = require('./request'),
    triggers    = require('./triggers');

var MAX_BATCH = 1000;


var defaults = {

    host            : 'http://api.segment.io',
    flushSize       : 50,
    maxQueueSize    : 10000,

    endpoints : {
        identify    : '/v2/i',
        track       : '/v2/t',
        batch       : '/v2/import'
    },

    triggers: [triggers.size, triggers.time]
};


/**
 * Batching Segment.io node client driver
 *
 * @param  {String} apiKey      - Segment.io api key
 * @param  {Object} options                              (optional)
 *   @option {String} host         - api base hostname
 *   @option {Number} flushSize    - size of queue before flush
 *   @option {Number} maxQueueSize - max size of queue to grow
 *   @option {Object} endpoints    - endpoints to make calls to
 *   @option {Array}  triggers     - series of functions to test saving
 *                                   [function () { returns {Boolean}; }]
 */
var Client = module.exports = function (apiKey, options) {

    this.initialized = false;

    this.lastFlush = null;

    this.queue = [];

    if (apiKey || options) {
        this.init(apiKey, options);
    }
};

util.inherits(Client, events.EventEmitter);


/**
 * Batching Segment.io node client driver
 *
 * @param  {String} apiKey      - Segment.io api key
 * @param  {Object} options                              (optional)
 *   @option {String} host         - api base hostname
 *   @option {Number} flushSize    - size of queue before flush
 *   @option {Number} maxQueueSize - max size of queue to grow
 *   @option {Object} endpoints    - endpoints to make calls to
 *   @option {Array}  triggers     - series of functions to test saving
 *                                   [function (queueLength, lastFlush) {
 *                                       returns {Boolean}; }]
 */
Client.prototype.init = function (apiKey, options) {

    if (!_.isString(apiKey) || apiKey.length === 0)
        throw new Error('Segment.io client must be initialized with a '+
                        'non-empty apiKey.');

    this.apiKey      = apiKey;
    this.options     = _.defaults(options || {}, defaults);

    this.lastFlush = new Date(0);
    this.queue = [];

    this.initialized = true;

    this.emit('initialized');
};


/**
 * Internal method to check whether the client has been initialized.
 * @return  {[type]} [description]
 * @private
 */
Client.prototype._checkInitialized = function () {
    if (!this.initialized)
        throw new Error('Segmentio client is not initialized. Please call ' +
                        'client.init(apiKey, options).');
};


/**
 * Identifying a visitor ties all of their actions to an ID you recognize and
 * can record visitor traits to segment by.
 *
 * You must pass in at least one of the userId or sessionId, so that the
 * visitor can be properly identified.
 *
 * @param  {Object} identify
 *   @param  {String}  sessionId - anonymous visitor's session id (optional)
 *   @param  {String}  visitorId - id for logged in visitor (needs sessionId if not provided)
 *   @param  {Object}  traits    - key/value object of tags for the visitor (optional)
 *
 * @param  {Object} context - app provided context about the visitor (optional)
 *   @option  {String}  ip
 *   @option  {String}  userAgent
 *   @option  {Number}  timestamp
 *
 */
Client.prototype.identify = function (identify, context) {

    this._checkInitialized();

    if (!_.isObject(identify)) {
        throw new Error('[segmentio]#identify: identify must be an object');
    }

    var sessionId = identify.sessionId,
        userId    = identify.userId,
        traits    = identify.traits || {};

    if (sessionId && !_.isString(sessionId))
        throw new Error('[segmentio]#identify: identify.sessionId must be a string.');

    if (userId && !_.isString(userId))
        throw new Error('[segmentio]#identify: identify.userId must be a string.');

    if (!_.isString(sessionId) && !_.isString(userId))
        throw new Error('[segmentio]#identify: either sessionId or userId ' +
                        'must be provided as a non-empty string.');

    var message = {

        action    : 'identify',
        sessionId : sessionId,
        userId    : userId,
        traits    : traits,
        context   : context || {}
    };

    this._enqueue(message);
};


/**
 * Whenever a user triggers an event on your site, you’ll want to track it
 * so that you can analyze and segment by those events later.
 *
 * @param {Object} track
 *   @param {String} sessionId  - id for the user's session (must supply either this or userId)
 *   @param {String} userId     - id for the actual visitor (must supply either this or sessionId)
 *   @param {String} event      - name of the event by the user i.e. "Booked a listing"
 *   @param {Object} properties - key/value tags for the event. (optional)
 *
 * @param {Object}   context - for additionally supplied information
 *   @option {Number} timestamp - timestamp in ms
 *
 * @param {Function} callback  (err) - (optional)
 */
Client.prototype.track = function (track) {

    this._checkInitialized();

    if (!_.isObject(track)) {

        throw new Error('[segmentio]#track: track must be an object');
    }


    var sessionId   = track.sessionId,
        userId      = track.userId,
        event       = track.event,
        properties  = track.properties || {};


    if (sessionId && !_.isString(sessionId))
        throw new Error('[segmentio]#track: track.sessionId must be a string.');

    if (userId && !_.isString(userId))
        throw new Error('[segmentio]#track: track.userId must be a string.');

    if (!_.isString(sessionId) && !_.isString(userId))
        throw new Error('[segmentio]#track: either track.sessionId or track.userId must be provided as a non-empty string.');

    if (!_.isString(event))
        throw new Error('[segmentio]#track: event must be a non-empty string.');

    var message = {

        action     : 'track',
        sessionId  : sessionId,
        userId     : userId,
        event      : event,
        properties : properties || {}
    };

    this._enqueue(message);
};



Client.prototype._enqueue = function (message) {

    var self = this;

    if (this.queue.length >= this.options.maxQueueSize) {
        // dropping this packet because the queue is full
        // to conserve memory
        this.emit('error',
                  new Error('Segment.io client failed to enqueue message ' +
                            'because queue is full. Consider increasing queue ' +
                            'size.'));
    } else {
        this.queue.push(message);
    }

    var shouldFlush = false;

    _.each(this.options.triggers, function (trigger) {

        if (_.isFunction(trigger)) {
            shouldFlush = shouldFlush || trigger.apply(self);
        }
    });

    if (shouldFlush) {
        this.flush();
    }
};


/**
 * Flushes the current queue
 */
Client.prototype.flush = function() {

    this._checkInitialized();

    var self = this;

    if (this.queue.length > 0) {

        this.emit('flushing');

        var batch = this.queue.splice(0, this.options.flushSize);
        this.queue = this.queue.splice(batch.length, this.queue.length -
                                                     batch.length);
        var callbacks = [];

        var payload = {
            apiKey      : this.apiKey,
            batch       : batch
        };

        var url = this.options.host + this.options.endpoints.batch;

        request(url, {

            method: 'POST',
            params: payload

        }, function (err, response, body) {

            if (err)
                self.emit('error', err);
            else
                self.emit('flushed');
        });

        this.lastFlush = new Date();
    }
};


