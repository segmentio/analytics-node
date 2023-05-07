#!/bin/sh

set -e

if [ "$RUN_E2E_TESTS" != "true" ]; then
  echo "Skipping end to end tests."
else
  echo "Running end to end tests..."
  wget https://github.com/segmentio/library-e2e-tester/releases/download/0.3.2/tester_linux_amd64 -O tester
  chmod +x tester
  ./tester -path='./cli.js' -concurrency=3
  echo "End to end tests completed!"
fi
