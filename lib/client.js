
var _ = require('underscore');

var sizeTrigger = function (queueSize, lastFlush) {
    return queueSize >= defaults.flushSize;
};

var timeTrigger = function (queueSize, lastFlush) {
    // flush if its been 10 seconds since the last one
    return Date.now() - lastFlush.getTime() > 1000 * 10;
};


var defaults = {
    host: 'http://api.segment.io',
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
 * Creates a new batching Segment.io node client driver
 * @param  {String} apiKey       Your segment.io API KEY. You can get one of these by registering a project at http://segment.io
 * @param  {String} environment Environment to log into depending on your current context
 * @param  {Object} options     Optional dictionary of options
 */
var Client = module.exports = function (apiKey, environment, options) {

    if (_.isObject(environment)) {
        options = environment;
        environment = 'development';
    }

    if (!_.isString(apiKey))
        throw new Error('Segment.io client must be initialized with a apiKey.');


    if (!_.isString(environment))
        throw new Error('Segment.io client must be initialized with an environment (like "development", "staging", or "production".');

    this.options = _.defaults(options, defaults);

    this.lastFlush = null;

    this.queue = [];
};

/**
 * Identifying a visitor ties all of their actions to an ID you
 * recognize and records visitor traits you can segment by.
 *
 * @param  {String}   sessionId The visitor's anonymous identifier until they log in, or
 * until your system knows who they are. In web systems, this is usually
 * the ID of this user in the sessions table. This can be null if you provide a visitorId.
 *
 * @param  {String}   visitorId The visitor's identifier after they log in, or you know
 * who they are. This is usually an email, but any unique ID will work.
 * By explicitly identifying a user, you tie all of their actions to
 * their identity. This makes it possible for you to run things like
 * segment-based email campaigns. If you don't know the visitors identity, you can leave this
 * null as long as you provide an anonymous sessionId.
 *
 * @param  {Object}   traits    A dictionary with keys like “Subscription Plan” or
 * “Favorite Genre”. You can segment your users by any trait you record.
 * Pass in values in key-value format. String key, then its value { String,
 * Integer, Boolean, Double, or Date are acceptable types for a value. }
 * So, traits array could be: "Subscription Plan", "Premium", "Friend Count",
 * 13 , and so forth.
 *
 * @param  {Object}   context   A dictionary with additional information thats related
 * to the visit. Examples are userAgent, and IP address of the visitor. Feel
 * free to pass in null if you don't have this information.
 *
 * @param  {Function} callback  Callback for when the action is flushed. Arguments passed in: (err)
 */
Client.prototype.identify = function (sessionId, visitorId, traits, context, callback) {

    if (_.isFunction(context)) {
        callback = context;
        context = {};
    }

    if (_.isFunction(traits)) {
        callback = traits;
        traits = {};
        context = {};
    }

    if (sessionId && !_.isString(sessionId))
        throw new Error('Segment.io Identify: sessionId must be a string.');

    if (visitorId && !_.isString(visitorId))
        throw new Error('Segment.io Identify: visitorId must be a string.');

    if (!_.isString(sessionId) && !_.isString(visitorId))
        throw new Error('Segment.io Identify: either sessionId or visitorId must be provided as a non-empty string.');

    var message = {

        action    : 'identify',
        sessionId : sessionId,
        visitorId : visitorId,
        traits    : traits || {},
        context   : context || {},
        callback  : callback

    };

    this._enqueue(message);
};

/**
 * Whenever a user triggers an event on your site, you’ll want to track it
 * so that you can analyze and segment by those events later.
 *
 * @param  {[type]}   event      The event name you are tracking. It is recommended that it
 * is in human readable form. For example, "Bought T-Shirt" or
 * "Started an exercise"

 * @param  {[type]}   properties A dictionary with items that describe the event in
 * more detail. This argument is optional, but highly recommended—you’ll
 * find these properties extremely useful later.
 *
 * @param  {Function} callback  Callback for when the action is flushed. Arguments passed in: (err)
 */
Client.prototype.track = function (sessionId, visitorId, event, properties, callback) {

    if (_.isFunction(properties)) {
        callback = properties;
        properties = {};
    }

    if (sessionId && !_.isString(sessionId))
        throw new Error('Segment.io Identify: sessionId must be a string.');

    if (visitorId && !_.isString(visitorId))
        throw new Error('Segment.io Identify: visitorId must be a string.');

    if (!_.isString(sessionId) && !_.isString(visitorId))
        throw new Error('Segment.io Identify: either sessionId or visitorId must be provided as a non-empty string.');

    if (!_.isString(event))
        throw new Error('Segment.io Track: event must be a non-empty string.');

    var chosenId = null;
    if (visitorId) chosenId = visitorId;
    else if (sessionId) chosenId = sessionId;

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
            shouldFlush = shouldFlush || trigger(self.queue.length, self.lastFlush);
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

    if (this.queue.length > 0) {

        var batch = this.queue.splice(0, this.options.flushSize);

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

        _.request(url, {

            method: 'POST',
            params: payload

        }, function (err, response, body) {

            _.each(callbacks, function (callback) {

                callback(err);

            });

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

    url = url.parse(url);

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