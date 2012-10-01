var should    = require('should'),
    segmentio = require('../lib/segmentio');


var options = {
    host : 'https://api.segment.io',
    flushSize : 1
};


describe('Segmentio module', function () {

    var userId    = 'test@segment.io',
        sessionId = '123456789',
        apiKey    = 'fakeid';

    it('should properly init', function () {

        segmentio.init(apiKey, options);
    });


    it('should properly identify', function () {

        segmentio.identify({ userId    : userId,
                             sessionId : sessionId,
                             traits    : { baller : true }});
    });

    it('should properly track', function () {

        segmentio.track({ userId  : userId,
                          event   : 'Ate a cookie' });
    });
});