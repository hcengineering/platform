#!/bin/bash
SRC_FOLDER=deploy
TARGET_FOLDER=$1
CHANNEL=latest

set -e
if [ -d "$TARGET_FOLDER" ]; then rm -Rf $TARGET_FOLDER; fi
mkdir $TARGET_FOLDER

cp $SRC_FOLDER/*.blockmap $TARGET_FOLDER
cp $SRC_FOLDER/*.dmg $TARGET_FOLDER
cp $SRC_FOLDER/*.zip $TARGET_FOLDER
cp $SRC_FOLDER/*.AppImage $TARGET_FOLDER
cp $SRC_FOLDER/*.deb $TARGET_FOLDER
cp $SRC_FOLDER/*.exe $TARGET_FOLDER
cp $SRC_FOLDER/$CHANNEL.yml $TARGET_FOLDER
cp $SRC_FOLDER/$CHANNEL-mac.yml $TARGET_FOLDER
cp $SRC_FOLDER/$CHANNEL-linux.yml $TARGET_FOLDER

# Create version-specific description files
rawVersion=$(node ../common/scripts/show_tag.js)
version=${rawVersion:1:${#rawVersion}-2}

cp $SRC_FOLDER/$CHANNEL.yml $TARGET_FOLDER/${version}.yml
cp $SRC_FOLDER/$CHANNEL-mac.yml $TARGET_FOLDER/${version}-mac.yml
cp $SRC_FOLDER/$CHANNEL-linux.yml $TARGET_FOLDER/${version}-linux.yml
