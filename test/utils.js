
var should = require('should');

/**
 * Sets up the listeners on a promise, to call 'done' on a flush and error on error.
 * @param {Function} done - completion callback
 */
exports.check = function (promise, done) {

  promise.once('err', function (err) {
    should.not.exist(err);
    done(err);
  });

  promise.once('flushed', function () {
    promise.removeAllListeners();
    done();
  });
};