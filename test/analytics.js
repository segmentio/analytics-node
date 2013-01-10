var should    = require('should'),

    analytics = require('../lib'),
    check     = require('./utils').check,

    // test options
    options   = require('./options');


describe('Analytics module', function () {

  var userId    = 'test@segment.io',
      sessionId = '123456789';

  it('should properly init', function (done) {

    analytics.init(options);
    done();
  });


  it('should properly identify', function (done) {

    var promise = analytics.identify({
                         userId    : userId,
                         sessionId : sessionId,
                         traits    : { baller : true }});

    check(promise, done);
  });

  it('should properly track', function (done) {

    var promise = analytics.track({
                      userId  : userId,
                      event   : 'Ate a cookie' });

    check(promise, done);
  });


  it('should properly flush', analytics.flush);

});