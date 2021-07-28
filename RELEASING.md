# RELEASING

We automatically publish Github tagged releases from our CI to NPM.

We use [`np`](https://github.com/sindresorhus/np) to prepare a release.

`np` will be automatically installed by running `yarn`, and you can run it with `yarn run np`. You can pass flags to it just as you would with `np`, e.g. you can run `yarn np minor`.

If you run `np` directly, take care to use the [`--no-publish`](https://github.com/sindresorhus/np#publish-with-a-ci) flag. This ensures that we don't directly publish to NPM from a local dev machine.
