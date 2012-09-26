

var Client = exports.Client = require('./client');


/**
 * Keep a default client for use directly via its api methods.
 */
var defaultClient = new Client();


/**
 * Initialize a default segmentio client with your application's API Key.
 * See client docs for detailed signature.
 */
exports.init = function () {
    defaultClient.init.apply(defaultClient, arguments);
};


/**
 * Module level track. See client docs for detailed signature.
 */
exports.track = function () {
    defaultClient.track.apply(defaultClient, arguments);
};


/**
 * Module level identify. See client docs for detailed signature.
 */
exports.identify = function () {
    defaultClient.identify.apply(defaultClient, arguments);
};