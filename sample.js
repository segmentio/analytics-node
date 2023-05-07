const os = require('os')
const uuid = require('uuid')
const Journify = require('.')
const journify = new Journify('xemyw6oe3n')

for (let i = 0; i < 10; i++) {
  for (let j = 0; j < 10; j++) {
    journify.track({
      anonymousId: uuid.v4(),
      userId: os.userInfo().username,
      event: 'Node Test',
      properties: {
        count: i + j
      }
    })
  }
}

journify.flush()
