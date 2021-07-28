#!/bin/bash

if ! eMSG=$(circleci config validate -c .circleci/config.yml); then
  echo "CircleCI Configuration Failed Validation." 
  echo $eMSG 
  exit 1
fi