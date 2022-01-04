# nodejs-segment-integration-example

 This is an example repo containing the Segment integration for Slack (Posting messages) with Action Destinations

 # Segment Integration

Refer the following documentation on integrating Segment analytics into your nodebackend CRUD APIs with Slack Integraton(Posting events to Slack Channel)
 - [Segement Analytics with NodeJs](https://segment.com/docs/connections/sources/catalog/libraries/server/node/)
 - [Segment Connection Destinations](https://segment.com/docs/connections/destinations/)
 - [Slack Webhooks integration](https://api.slack.com/messaging/webhooks)


## Available Scripts

In the project directory, you need to create a .env file at the root level with the YOUR_WRITE_API_KEY for Segment integration and PORT on which you will running the API locally. 

```
YOUR_WRITE_API_KEY=xxxxxxxxxxxxxxxxx
PORT=3000
```

### `npm install`

### `npm run compile`

### `npm run start:dev`

Runs the server in the development mode using node<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.


## Thanks
* To [Segment Team](https://segment.com/) for the great documentation on the Destinations integration.
