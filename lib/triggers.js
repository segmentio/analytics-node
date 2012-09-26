

/**
 * Flush the queue after it reaches options.flushSize
 * @return {Boolean} whether to flush the queue.
 */
exports.size = function () {
    return this.queue.length >= this.options.flushSize;
};


/**
 * Flush the queue after a certain amount of time has passed.
 * @return {Boolean} whether to flush the queue.
 */
exports.time = function () {
    // flush if its been 10 seconds since the last one
    return Date.now() - this.lastFlush > 1000 * 10;
};