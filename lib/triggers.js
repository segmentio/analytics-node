

/**
 * Flush the queue after it reaches options.flushAt
 * @return {Boolean} whether to flush the queue.
 */
exports.size = function () {
  return this.queue.length >= this.options.flushAt;
};


/**
 * Flush the queue after a certain amount of time has passed.
 * @return {Boolean} whether to flush the queue.
 */
exports.time = function () {
  // flush if its been flushAfter milliseconds since the last flush
  return Date.now() - this.lastFlush > this.options.flushAfter;
};