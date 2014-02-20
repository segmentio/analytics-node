var should    = require('should'),

    analytics = require('../lib'),
    check     = require('./utils').check,

    // test options
    options   = require('./options');


describe('Analytics module', function () {

  var userId    = 'test@segment.io';

  it('should properly init', function (done) {

    analytics.init(options);
    done();
  });


  it('should properly identify', function (done) {

    var promise = analytics.identify({
                         userId    : userId,
                         traits    : { baller : true }});

    check(promise, done);
  });

  it('should properly track', function (done) {

    var promise = analytics.track({
                      userId  : userId,
                      event   : 'Ate a cookie' });

    check(promise, done);
  });

  it('should properly alias', function (done) {

    var promise = analytics.alias({
                      from : 'from',
                      to   : 'to' });

    check(promise, done);
  });

  it('should properly group', function (done) {

    var promise = analytics.group({
                      userId   : 'id',
                      groupId : 'id',
                      traits   : {} });

    check(promise, done);
  });


  it('should properly flush', analytics.flush);

});
