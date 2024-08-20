#!/bin/bash
endpoint=https://47fadbaa4ecbea9f3e8b7043a4584e27.r2.cloudflarestorage.com
bucket=desktop-distro
rawVersion=$(node common/scripts/show_tag.js)
version=${rawVersion:1:${#rawVersion}-2}

cd desktop-package/deploy
aws s3api put-object --endpoint $endpoint --bucket $bucket --key ${version}-mac.yml --body latest-mac.yml --acl public-read 2>&1 > /dev/null
aws s3api put-object --endpoint $endpoint --bucket $bucket --key ${version}-linux.yml --body latest-linux.yml --acl public-read 2>&1 > /dev/null
aws s3api put-object --endpoint $endpoint --bucket $bucket --key ${version}.yml --body latest.yml --acl public-read 2>&1 > /dev/null

echo Successully published version ${version} to ${endpoint}/${bucket}
