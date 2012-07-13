
var Client = require('./client');

// create the default client
var defaultClient = new Client();

/**
 * Exposes the Client constructor so new clients can be made
 * @type {[Segmentio.Client]}
 */
defaultClient.Client = Client;

module.exports = defaultClient;