#!/usr/bin/env bash
export INIT_SCRIPTS_BRANCH=${INIT_SCRIPTS_BRANCH:-main}
# Download init repository
# Check if the file already exists
if [ -e "${INIT_SCRIPTS_BRANCH}.zip" ]; then
  echo "File ${INIT_SCRIPTS_BRANCH}.zip already exists, skipping download"
else
  wget https://github.com/hcengineering/init/archive/refs/heads/${INIT_SCRIPTS_BRANCH}.zip
fi

unzip ${INIT_SCRIPTS_BRANCH}.zip -d ./temp
rm -rf ./init 
mv temp/init-${INIT_SCRIPTS_BRANCH} ./init
rm -rf ./temp
