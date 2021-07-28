const os = require('os')
const uuid = require('uuid')
const Analytics = require('.')
const analytics = new Analytics('xemyw6oe3n')

for (let i = 0; i < 10; i++) {
  for (let j = 0; j < 10; j++) {
    analytics.track({
      anonymousId: uuid.v4(),
      userId: os.userInfo().username,
      event: 'Node Test',
      properties: {
        count: i + j
      }
    })
  }
}

analytics.flush()
