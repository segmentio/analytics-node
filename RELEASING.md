# Releasing

To cut a release, do:

```
$ git changelog --tag <version>
$ vim package.json # update ".version"
$ git release <version>
```

Where `<version>` represents a valid [semver](http://semver.org) version number.
