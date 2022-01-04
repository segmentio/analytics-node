import Analytics from 'analytics-node'

if (!process.env.YOUR_WRITE_API_KEY) {
    throw Error('Segment write Key is not set!')
}

const analytics = new Analytics(process.env.YOUR_WRITE_API_KEY as string, { flushAt: 1 });

export default analytics