var Analytics = require('./')

var temp = new Analytics('fakekey')

module.exports = AnalyticsMock

function AnalyticsMock () {
  if (!(this instanceof AnalyticsMock)) {
    return new AnalyticsMock()
  }
}

for (var key in temp) {
  var fn = temp[key]
  if (typeof fn === 'function') {
    AnalyticsMock.prototype[key] = mock
  }
}

function mock () {
  var callback = arguments[arguments.length - 1]
  if (typeof callback === 'function') {
    process.nextTick(callback)
  }
}
