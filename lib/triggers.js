
/**
 * Flush the queue after it reaches `options.flushAt` in length.
 *
 * @param {Client} client
 * @return {Boolean}
 */

exports.size = function(client){
  return client.queue.length >= client.options.flushAt;
};

/**
 * Flush the queue after a certain amount of time has passed.
 *
 * @param {Client} client
 * @return {Boolean}
 */

exports.time = function(client){
  return Date.now() - client.lastFlush > client.options.flushAfter;
};