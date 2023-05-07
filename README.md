# Journify Node.js SDK
The official Node.js client for [Journify](https://journify.io) — The hassle-free way to integrate Journify into any Node.js application.

## Installation
```sh
# npm
npm install @journifyio/nodejs-sdk

# yarn
yarn add @journifyio/nodejs-sdk

# pnpm
pnpm add @journifyio/nodejs-sdk
```

## Usage
```js
const Journify = require('@journifyio/nodejs-sdk');

const client = new Journify('<YOUR_WRITE_KEY>');

client.track({
  event: 'event name',
  userId: 'user id'
});
```

## Documentation
Documentation is available at [https://docs.journify.io/sources/nodejs-sdk](https://docs.journify.io/sources/nodejs-sdk).

# Contributing
You can contribute to Journify Node.js SDK by forking the repo and making pull requests on the `master` branch.

To publish a new version, you need to add a prefix to your pull request title following the [semantic versioning spec](https://semver.org/):
* **[MAJOR]** \{Pull request title\}
* **[MINOR]** \{Pull request title\}
* **[PATCH]** \{Pull request title\}

Once your PR is merged and the CI pipeline is passed, your code will be published to npm.
