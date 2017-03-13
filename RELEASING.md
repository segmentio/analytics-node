# Releasing

To cut a release, do:

```
$ git changelog --tag <version>
$ vim package.json # update ".version"
$ git release <version>
```

Where `<version>` represents a valid [semver](http://semver.org) version number.

CircleCI will handle rebuilding `analytics-node.js` and publishing to npm for you.
