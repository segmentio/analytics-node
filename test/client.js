
var should = require('should'),
    Client = require('../lib/client');


var options = {

    host : 'http://localhost:81',
    flushSize : 1

};


/**
 * Sets up the listeners for seg, to call 'done' on a flush and error on error.
 * @param {Function} done - completion callback
 */
var setListeners = function (seg, done) {

    var listenerId = seg.once('error', function (err) {
        should.not.exist(err);
    });

    seg.once('flushed', function () {
        seg.removeAllListeners();
        done();
    });
};



describe('Batch', function () {

    var userId    = 'test@segment.io',
        sessionId = '123456789',
        apiKey    = 'fakeid';

    var seg = new Client(apiKey, options);


    it('should properly identify', function (done) {

        setListeners(seg, done);

        seg.identify({ userId    : userId,
                       sessionId : sessionId,
                       traits    : { baller : true }});
    });

    it('should properly track', function (done) {

        setListeners(seg, done);

        seg.track({ userId  : userId,
                    event   : 'Ate a cookie' });
    });


});