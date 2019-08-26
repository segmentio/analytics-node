const tasks = arr => arr.join(' && ')
module.exports = {
  'hooks': {
    'pre-commit': tasks([
      'exec < /dev/tty',
      `if ! [ -x "$(command -v circleci)" ]; then
        echo "If you want to verify your circleci config precommit, please install the local circleci tool from https://circleci.com/docs/2.0/local-cli/"; else
        yarn run circle-lint
      fi`
    ])
  }
}