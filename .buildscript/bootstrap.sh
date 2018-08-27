#!/bin/bash

if ! which brew >/dev/null; then
  echo "homebrew is not available. Install it from http://brew.sh"
  exit 1
else
  echo "homebrew already installed"
fi

if ! which node >/dev/null; then
  echo "installing node..."
  brew install node
else
  echo "node already installed"
fi

if ! which yarn >/dev/null; then
  echo "installing yarn..."
  brew install yarn
else
  echo "yarn already installed"
fi

echo "all dependencies installed."
