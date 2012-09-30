
var should = require('should'),
    Client = require('../lib/client');


var options = {
    host : 'http://localhost:81',
    flushSize : 1,
    timerInterval: 750
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


describe('Client initialize', function () {

    it('should throw an error if not initialzed', function () {

        var client = new Client();

        (function () {

            client.track({
                event  : 'Threw an exception',
                userId : 'test@segment.io'
            });

        }).should.throw();
    });

    it('should initialize automatically with constructor args', function () {

        var client = new Client('fakeid', options);

        client.track({
            event  : 'Track succeeded',
            userId : 'test@segment.io'
        });
    });


    it('should not allow non-string API Keys', function () {

        (function () {

            var seg = new Client(1234);

        }).should.throw();
    });
});



describe('Client track', function () {

    var apiKey  = 'fakeid',
        client  = new Client(apiKey, options);


    it('should not track a call with bad data', function () {

        (function () {

            client.track('Not an object');

        }).should.throw();
    });


    it('should not track a call without any user info', function () {

        (function () {

            client.track({ event : 'Hello' });

        }).should.throw();
    });


    it('should not track a call without an event', function () {

        (function () {

            client.track({ userId : 'test@segment.io' });

        }).should.throw();
    });

    it('should track successfully', function () {

        client.track({ userId : 'test@segment.io',
                       event  : 'Test Event' });

        client.track({ sessionId : '12345678910',
                       event     : 'Test Event' });
    });
});


describe('Client identify', function () {

    var apiKey  = 'fakeid',
        client  = new Client(apiKey, options);

    it('should not identify without a user or session', function () {

        (function () {

            client.identify({ traits : { yellow : 'dog' }});

        }).should.throw();
    });

    it('should identify successfully', function () {

        client.identify({ userId    : 'test@segment.io',
                          sessionId : '1234' });

        client.identify({ userId : 'test@segment.io',
                          traits : { account : 'pro' }});
    });
});




describe('Client batch', function () {

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

    it('should emit when there are too many objects in the queue',
        function (done) {

        seg.on('error', function (err) {

            should.exist(err);
            seg.queue.should.have.length(0);

            seg.removeAllListeners();
            seg.options.maxQueueSize = 1000;

            done();
        });

        seg.options.maxQueueSize = 0;

        seg.track({ userId : userId,
                    event  : 'Overflowed the queue' });
    });


    it('should upload after ten seconds since last sync', function (done) {

        this.timeout(11000);

        setListeners(seg, done);

        seg.options.flushSize = 10;

        seg.track({ userId : userId,
                    event  : 'Successfully tracked a user' });

    });
});

