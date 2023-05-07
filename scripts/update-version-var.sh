#!/bin/sh
PKG_VERSION=$(node --eval="process.stdout.write(require('./package.json').version)")

cat <<EOF > ./src/lib/generated/libVersion.ts
// This file is generated.
export const LIB_VERSION = '$PKG_VERSION'
EOF
