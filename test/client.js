
var _      = require('underscore'),
    should = require('should'),

    Client = require('../lib/client'),
    check  = require('./utils').check,

    // test options
    options = require('./options');


describe('Client', function () {

  describe('#init', function () {

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

        var client = new Client(options);

        client.track({
            event  : 'Track succeeded',
            userId : 'test@segment.io'
        });
    });


    it('should not allow non-string options', function () {

        (function () {

            var seg = new Client(1234);

        }).should.throw();
    });

    it('should allow test mode', function (done) {

        var testOptions = _.extend({}, options, { send: false });

        var client = new Client(testOptions);

        var promise = client.track({
            event  : 'Threw an exception',
            userId : 'test@segment.io'
        });

        // the client should flush immediately
        promise.on('flush', function () {
          // and there should have been no actual flushes
          client.lastFlush.should.equal(new Date(0));
          done();
        });
    });

  });

  describe('#track', function () {

    var client  = new Client(options);


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

    it('should not track with bad timestamp', function () {

      (function () {

        client.track({ userId : 'test@segment.io', timestamp: 12298383 });

      }).should.throw();
    });

    it('should track successfully', function () {

      client.track({ userId : 'test@segment.io',
                     event  : 'Test Event' });

      client.track({ userId    : 'ilya@segment.io',
                     event     : 'Test Event' });
    });
  });


  describe('#alias', function () {

    var client  = new Client(options);


    it('should not alias with bad data', function () {

      (function () {

        client.alias('Not an object');

      }).should.throw();
    });


    it('should not alias without any user info', function () {

      (function () {

        client.alias({});

      }).should.throw();
    });


    it('should not alias without a from', function () {

      (function () {

        client.alias({ to : 'test@segment.io' });

      }).should.throw();
    });

    it('should not alias without a to', function () {

      (function () {

        client.alias({ from : 'test@segment.io' });

      }).should.throw();
    });

    it('should not alias with bad timestamp', function () {

      (function () {

        client.alias({ from : 'from', to: 'to', timestamp: 12298383 });

      }).should.throw();
    });

    it('should alias successfully', function () {

      client.alias({ from  : 'from',
                     to    : 'test@segment.io'});

    });
  });


  describe('#identify', function () {

    var client  = new Client(options);

    it('should not identify without a user', function () {

      (function () {

        client.identify({ traits : { yellow : 'dog' }});

      }).should.throw();
    });

    it('should not identify with bad timestamp', function () {

      (function () {

      client.identify({ userId    : 'test@segment.io',
                        timestamp : 'wooo' });

      }).should.throw();
    });

    it('should identify successfully', function () {

      client.identify({ userId    : 'test@segment.io',
                        timestamp : new Date('2012-12-02T00:30:08.276Z') });

      client.identify({ userId : 'test@segment.io',
                        traits : { account : 'pro' },
                        timestamp : new Date('2012-12-02T00:30:08.276Z')});
    });
  });

  describe('#group', function () {

    var client  = new Client(options);

    it('should not group without options', function () {
      client.group.bind(client).should.throw();
    });

    it('should not identify without groupId', function () {
      client.group.bind(client, { userId: 12 }).should.throw();
    });

    it('should not identify without userId or sessionId', function () {
      client.group.bind(client, { groupId: 12 }).should.throw();
    });

    it('should not identify with bad timestamp', function () {
      client.group.bind(client, { groupId: 12, userId: 12, timestamp: 500 }).should.throw();
    });

    it('should identify successfully', function () {
      client.group({
        userId: 12,
        groupId: 10,
        timestamp: new Date
      })
    });
  });

  describe('#flush', function () {

    var userId    = 'test@segment.io';

    var client = new Client(options);

    it('should properly identify', function (done) {

      var promise = client.identify({
                     userId    : userId,
                     traits    : { baller : true },
                     timestamp : new Date('2012-12-02T00:30:08.276Z')});

      check(promise, done);

    });

    it('should properly track', function (done) {

      var promise = client.track({
                  userId    : userId,
                  event     : 'Ate a cookie',
                  timestamp : new Date('2012-12-02T00:30:08.276Z') });

      check(promise, done);

    });

    it('should emit when there are too many objects in the queue',
        function (done) {

      client.on('error', function (err) {

        should.exist(err);
        client.queue.should.have.length(0);

        client.removeAllListeners();
        client.options.maxQueueSize = 1000;

        done();
      });

      client.options.maxQueueSize = 0;

      client.track({ userId : userId,
                     event  : 'Overflowed the queue' });
    });

    it('should upload flush after flushAt has been added to the queue', function (done) {

      var flushAt = 5;

      // check that the queue is empty initially
      client.queue.should.have.length(0);

      client.options.flushAt = flushAt;

      _.each(_.range(flushAt-1), function () {

        client.track({ userId : userId,
                       event  : 'Successfully tracked a user' });
      });

      // check that it hasn't flushed yet
      client.queue.should.have.length(flushAt - 1);

      // run it to make sure it flushes now
      client.track({ userId : userId,
                     event  : 'Successfully tracked a user' });

      client.queue.should.have.length(0);

      check(client, done);
    });

    it('should upload after timerInterval seconds since last sync', function (done) {

      // wait 2 seconds more than one timer interval
      this.timeout(client.options.timerInterval + 2000);

      // check that the queue is empty initially
      client.queue.should.have.length(0);

      // flush after 10 messages are in the queue (we wont hit this condition)
      client.options.flushAt = 10;
      // flush after no flush has happened for half the time of the timer interval
      client.options.flushAfter = client.options.timerInterval / 2;

      var promise = client.track({
                  userId : userId,
                  event  : 'Successfully tracked a user' });

      check(promise, done);
    });

  });

});


