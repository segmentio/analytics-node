
var triggers = require('./triggers');

/**
 * Defaults for Client Initialization
 * @type {Object}
 */
module.exports = {

  /**
   * Uses this host to send messages to
   * @type {String}
   */
  host            : 'https://api.segment.io',

  /**
   * URL endpoints (including version)
   * @type {Object}
   */
  endpoints : {
      identify    : '/v1/identify',
      track       : '/v1/track',
      alias       : '/v1/alias',
      batch       : '/v1/import'
  },

  //
  /// Trigger Options
  //

  /**
   * Flush after this many messages are in the queue
   * @type {Number}
   */
  flushAt         : 20,
  /**
   * Flush after this many milliseconds have passed since the
   * last flush
   * @type {Number}
   */
  flushAfter      : 10000,

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
  triggers: [triggers.size, triggers.time],

  /**
   * Specifies whether the client should send requests to the server
   * Used in test suites to turn off requests
   * @type {Boolean}
   */
  send: true
};