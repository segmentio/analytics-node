
var _           = require('underscore'),
    events      = require('events'),
    http        = require('http'),
    urlParser   = require('url'),
    util        = require('util');

var MAX_BATCH = 1000;

var sizeTrigger = function () {
    return this.queue.length >= this.options.flushSize;
};

var timeTrigger = function () {
    // flush if its been 10 seconds since the last one
    return Date.now() - this.lastFlush > 1000 * 10;
};


var defaults = {
    host: 'http://api.segment.io/',
    flushSize: 50,
    maxQueueSize: 10000,
    endpoints: {
        identify: '/v2/i',
        track: '/v2/t',
        batch: '/v2/import'
    },
    triggers: [sizeTrigger, timeTrigger]
};


/**
 * Batching Segment.io node client driver
 *
 * @param  {String} apiKey      - Segment.io api key
 * @param  {String} environment - environment to log for (optional)
 * @param  {Object} options                              (optional)
 *   @option {String} host         - api base hostname
 *   @option {Number} flushSize    - size of queue before flush
 *   @option {Number} maxQueueSize - max size of queue to grow
 *   @option {Object} endpoints    - endpoints to make calls to
 *   @option {Array}  triggers     - series of functions to test saving
 *                                   [function (queueLength, lastFlush) {
 *                                       returns {Boolean}; }]
 */
var Client = module.exports = function (apiKey, environment, options) {

    this.initialized = false;

    this.lastFlush = null;

    this.queue = [];

    if (apiKey || environment || options) {
        this.init(apiKey, environment, options);
    }
};

util.inherits(Client, events.EventEmitter);


/**
 * Batching Segment.io node client driver
 *
 * @param  {String} apiKey      - Segment.io api key
 * @param  {String} environment - environment to log for (optional)
 * @param  {Object} options                              (optional)
 *   @option {String} host         - api base hostname
 *   @option {Number} flushSize    - size of queue before flush
 *   @option {Number} maxQueueSize - max size of queue to grow
 *   @option {Object} endpoints    - endpoints to make calls to
 *   @option {Array}  triggers     - series of functions to test saving
 *                                   [function (queueLength, lastFlush) {
 *                                       returns {Boolean}; }]
 */
Client.prototype.init = function (apiKey, environment, options) {

    if (_.isObject(environment)) {
        options = environment;
        environment = null;
    }

    if (!_.isString(apiKey))
        throw new Error('Segment.io client must be initialized with a apiKey.');


    this.environment = environment || "production";
    this.apiKey      = apiKey;
    this.options     = _.defaults(options, defaults);

    this.lastFlush = new Date(0);
    this.queue = [];

    this.initialized = true;

    this.emit('initialized');
};


Client.prototype._checkInitialized = function () {
    if (!this.initialized)
        throw new Error('Segmentio client is not initialized. Please call client.init (apiKey, environment, options).');
};


/**
 * Identifying a visitor ties all of their actions to an ID you recognize and
 * records visitor traits you can segment by.
 *
 * You must pass in at least one of the visitorId or sessionId, so that the
 * visitor can be properly identified.
 *
 * @param  {Object} identify
 *   @param  {String}  session - anonymous visitor's session id (optional)
 *   @param  {String}  visitor - id for logged in visitor (needs sessionId if not provided)
 *   @param  {Object}  traits  - key/value object of tags for the visitor (optional)
 *
 * @param  {Object} context - app provided context about the visitor (optional)
 *   @option  {String}  ip
 *   @option  {String}  userAgent
 *   @option  {Number}  timestamp
 *
 * @param  {Function} callback (err) - (optional)
 *
 */
Client.prototype.identify = function (identify, context, callback) {

    this._checkInitialized();

    if (!_.isObject(identify)) {

        throw new Error('[segmentio]#identify: identify must be an object');
    }


    if (_.isFunction(context)) {
        callback = context;
        context = {};
    }


    var sessionId = identify.session,
        visitorId = identify.visitor,
        traits    = identify.traits || {};

    if (sessionId && !_.isString(sessionId))
        throw new Error('[segmentio]#identify: identify.sessionId must be a string.');

    if (visitorId && !_.isString(visitorId))
        throw new Error('[segmentio]#identify: identify.visitorId must be a string.');

    if (!_.isString(sessionId) && !_.isString(visitorId))
        throw new Error('[segmentio]#identify: either sessionId or visitorId must be provided as a non-empty string.');

    var message = {

        action    : 'identify',
        sessionId : sessionId,
        visitorId : visitorId,
        traits    : traits,
        context   : context || {},
        callback  : callback
    };

    this._enqueue(message);
};

/**
 * Whenever a user triggers an event on your site, you’ll want to track it
 * so that you can analyze and segment by those events later.
 *
 * @param {Object} track
 *   @param {String} session    - id for the visitor's session (must supply either this or visitor id)
 *   @param {String} visitor    - id for the actual visitor (must supply either this or session)
 *   @param {String} event      - name of the event by the user i.e. "Booked a listing"
 *   @param {Object} properties - key/value tags for the event. (optional)
 *
 * @param {Object}   context - for additionally supplied information
 *   @option {Number} timestamp - timestamp in ms
 *
 * @param {Function} callback  (err) - (optional)
 */
Client.prototype.track = function (track, context) {

    this._checkInitialized();

    if (!_.isObject(track)) {

        throw new Error('[segmentio]#track: track must be an object');
    }

    if (_.isFunction(context)) {
        callback = context;
        context = {};
    }

    var sessionId   = track.session,
        visitorId   = track.visitor,
        event       = track.event,
        properties  = track.properties || {};


    if (sessionId && !_.isString(sessionId))
        throw new Error('[segmentio]#track: track.sessionId must be a string.');

    if (visitorId && !_.isString(visitorId))
        throw new Error('[segmentio]#track: track.visitorId must be a string.');

    if (!_.isString(sessionId) && !_.isString(visitorId))
        throw new Error('[segmentio]#track: either track.sessionId or track.visitorId must be provided as a non-empty string.');

    if (!_.isString(event))
        throw new Error('[segmentio]#track: event must be a non-empty string.');

    // API only takes one, we prefer visitorId.
    var chosenId = visitorId || sessionId;

    var message = {

        action     : 'track',
        visitorId  : chosenId,
        event      : event,
        properties : properties || {},
        callback   : callback
    };

    this._enqueue(message);
};

Client.prototype._enqueue = function (message) {

    var self = this;

    var callback = message.callback;

    if (this.queue.length >= this.options.maxQueueSize) {
        // dropping this packet because the queue is full
        // to conserve memory
        if (callback)
            return callback(
                new Error('Segment.io client failed to enqueue message because queue is full. Consider increasing queue size.'));

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


        _.each(batch, function (message) {

            // save the callbacks
            if (message.callback) callbacks.push(message.callback);
            delete message.callback;

        });


        var payload = {
            project: {
                apiKey      : this.apiKey,
                environment : this.environment
            },
            batch: batch
        };

        var url = this.options.host + this.options.endpoints.batch;

        _request(url, {

            method: 'POST',
            params: payload

        }, function (err, response, body) {

            _.each(callbacks, function (callback) {

                callback(err);

            });

            self.emit('flushed');

        });

        this.lastFlush = new Date();
    }

};


 /**
    FROM: https://gist.github.com/1393666

  * UrlReq - Wraps the http.request function making it nice for unit testing APIs.
  *
  * @param  {string}   url   The required url in any form
  * @param  {object}   options  An options object (this is optional)
  * @param  {Function} callback       This is passed the 'res' object from your request
  *
  */
var _request = function(url, options, callback){

    if(_.isFunction(options)) {
        callback = options;
        options = {};
    }

    url = urlParser.parse(url);

    var settings = {
        host: url.hostname,
        port: url.port || 80,
        path: url.pathname,
        headers: options.headers || {},
        method: options.method
    };

    // if there are params:
    if(options.params){
        options.params = JSON.stringify(options.params);
        settings.headers['Content-Type'] = 'application/json';
        settings.headers['Content-Length'] = options.params.length;
    }

    // MAKE THE REQUEST
    var req = http.request(settings);

    // if there are params: write them to the request
    if(options.params) {
        req.write(options.params);
    }

    req.on('error', function (err) {
        callback(e);
    });

    // when the response comes back
    req.on('response', function(res){

        res.body = '';
        res.setEncoding('utf-8');

        // concat chunks
        res.on('data', function(chunk) {
            res.body += chunk;
        });

        // when the response has finished
        res.on('end', function(){

            // fire callback
            callback(null, res.body, res);
        });

    });

    // end the request
    req.end();
};