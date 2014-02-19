

var _      = require('underscore'),
    events = require('events'),
    Client = require('./client');



/**
 * Keep a default client for use directly via its api methods.
 */
var defaultClient = new Client();

var api = ['init', 'track', 'identify', 'flush', 'alias', 'group'];

/**
 * Add the default client's public API methods to the module
 */
_.each(api, function (method) {
  exports[method] = function () {
    return defaultClient[method].apply(defaultClient, arguments);
  };
});

/**
 * Add our eventEmitter calls for the client.
 * @param  {Function} fn  [description]
 */
_.each(events.EventEmitter.prototype, function (fn, key) {

  exports[key] = function () {
    defaultClient[key].apply(defaultClient, arguments);
  };
});

exports.defaults = require('./defaults');
exports.triggers = require('./triggers');
exports.Client   = Client;
