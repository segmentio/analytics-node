
var assert = require('assert');
var Analytics = require('..');

var a;
var noop = function(){};
var context = {
  library: {
    name: 'analytics-node',
    version: require('../package.json').version
  }
};

describe('Analytics', function(){
  beforeEach(function(){
    a = Analytics('key', {
      host: 'http://localhost:4063',
      flushAt: Infinity,
      flushAfter: Infinity
    });
  });

  it('should expose a constructor', function(){
    assert.equal('function', typeof Analytics);
  });

  it('should require a write key', function(){
    assert.throws(Analytics, error('You must pass your Segment.io project\'s write key.'));
  });

  it('should not require the new keyword', function(){
    assert(a instanceof Analytics);
  });

  it('should create a queue', function(){
    assert.deepEqual(a.queue, []);
  });

  it('should set default options', function(){
    var a = Analytics('key');
    assert.equal(a.writeKey, 'key');
    assert.equal(a.host, 'https://api.segment.io');
    assert.equal(a.flushAt, 20);
    assert.equal(a.flushAfter, 10000);
  });

  it('should take options', function(){
    var a = Analytics('key', {
      host: 'a',
      flushAt: 1,
      flushAfter: 2
    });
    assert.equal(a.host, 'a');
    assert.equal(a.flushAt, 1);
    assert.equal(a.flushAfter, 2);
  });

  it('should keep the flushAt option above zero', function(){
    var a = Analytics('key', { flushAt: 0 });
    assert.equal(a.flushAt, 1);
  });

  describe('#enqueue', function(){
    it('should add a message to the queue', function(){
      var message = {};
      var callback = function(){};
      a.enqueue(message, callback);
      assert.deepEqual(a.queue[0], {
        message: message,
        callback: callback
      });
    });

    it('should flush the queue if it hits the max length', function(done){
      a.flushAt = 1;
      a.flushAfter = null;
      a.flush = done;
      a.enqueue();
    });

    it('should flush after a period of time', function(done){
      a.flushAt = Infinity;
      a.flushAfter = 1;
      a.flush = done;
      a.enqueue();
    });

    it('should reset an existing timer', function(done){
      var i = 0;
      a.flushAt = Infinity;
      a.flushAfter = 1;
      a.flush = function(){ i++; };
      a.enqueue();
      a.enqueue();
      setTimeout(function(){
        assert.equal(1, i);
        done();
      }, 1);
    });
  });

  describe('#flush', function(){
    it('should not fail when no items are in the queue', function(done){
      a.flush(done);
    });

    it('should send a batch of items', function(done){
      a.flushAt = 2;
      enqueue(a, [1, 2, 3]);
      a.flush(function(err, data){
        assert(!err);
        assert.deepEqual(data.batch, [1, 2]);
        done();
      });
    });

    it('should send a context', function(done){
      enqueue(a, [1]);
      a.flush(function(err, data){
        assert(!err);
        assert.deepEqual(data.context, context);
        done();
      });
    });

    it('should callback with an HTTP error', function(done){
      enqueue(a, ['error']);
      a.flush(function(err, data){
        assert(err);
        assert.equal(err.message, 'error');
        done();
      });
    });
  });

  describe('#identify', function(){
    it('should enqueue a message', function(){
      a.identify({ userId: 'id' });
      assert.deepEqual(a.queue[0].message, {
        action: 'identify',
        userId: 'id'
      });
    });

    it('should validate a message', function(){
      assert.throws(a.identify, error('You must pass a message object.'));
    });

    it('should require a userId or anonymousId', function(){
      assert.throws(function(){
        a.identify({});
      }, error('You must pass either an "anonymousId" or a "userId".'));
    });
  });

  describe('#group', function(){
    it('should enqueue a message', function(){
      a.group({ groupId: 'group', userId: 'user' });
      assert.deepEqual(a.queue[0].message, {
        action: 'group',
        userId: 'user',
        groupId: 'group'
      });
    });

    it('should validate a message', function(){
      assert.throws(a.group, error('You must pass a message object.'));
    });

    it('should require a userId or anonymousId', function(){
      assert.throws(function(){
        a.group({});
      }, error('You must pass either an "anonymousId" or a "userId".'));
    });

    it('should require a groupId', function(){
      assert.throws(function(){
        a.group({ userId: 'id' });
      }, error('You must pass a "groupId".'));
    });
  });

  describe('#track', function(){
    it('should enqueue a message', function(){
      a.track({ userId: 'id', event: 'event' });
      assert.deepEqual(a.queue[0].message, {
        action: 'track',
        event: 'event',
        userId: 'id'
      });
    });

    it('should validate a message', function(){
      assert.throws(a.track, error('You must pass a message object.'));
    });

    it('should require a userId or anonymousId', function(){
      assert.throws(function(){
        a.track({});
      }, error('You must pass either an "anonymousId" or a "userId".'));
    });

    it('should require an event', function(){
      assert.throws(function(){
        a.track({ userId: 'id' });
      }, error('You must pass an "event".'));
    });
  });

  describe('#page', function(){
    it('should enqueue a message', function(){
      a.page({ userId: 'id' });
      assert.deepEqual(a.queue[0].message, {
        action: 'page',
        userId: 'id'
      });
    });

    it('should validate a message', function(){
      assert.throws(a.page, error('You must pass a message object.'));
    });

    it('should require a userId or anonymousId', function(){
      assert.throws(function(){
        a.page({});
      }, error('You must pass either an "anonymousId" or a "userId".'));
    });
  });

  describe('#alias', function(){
    it('should enqueue a message', function(){
      a.alias({ previousId: 'previous', userId: 'id' });
      assert.deepEqual(a.queue[0].message, {
        action: 'alias',
        previousId: 'previous',
        userId: 'id'
      });
    });

    it('should validate a message', function(){
      assert.throws(a.alias, error('You must pass a message object.'));
    });

    it('should require a userId', function(){
      assert.throws(function(){
        a.alias({});
      }, error('You must pass a "userId".'));
    });

    it('should require a previousId', function(){
      assert.throws(function(){
        a.alias({ userId: 'id' });
      }, error('You must pass a "previousId".'));
    });
  });

});

/**
 * Create a queue with `messages`.
 *
 * @param {Analytics} a
 * @param {Array} messages
 * @return {Array}
 */

function enqueue(a, messages){
  a.queue = messages.map(function(msg){
    return {
      message: msg,
      callback: noop
    };
  });
}

/**
 * Assert an error with `message` is thrown.
 *
 * @param {String} message
 * @return {Function}
 */

function error(message){
  return function(err){
    return err.message == message;
  };
}