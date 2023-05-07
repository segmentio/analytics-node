#!/bin/sh
PKG_VERSION=$(node --eval="process.stdout.write(require('./package.json').version)")

cat <<EOF > ./generated/libVersion.js
// This file is generated.
const LIB_VERSION = '$PKG_VERSION'
module.exports = {
  LIB_VERSION,
}
EOF
