@echo off
for /f %%i in ('node ../common/scripts/show_version.js') do set MODEL_VERSION=%%i
for /f %%i in ('node ../common/scripts/show_tag.js') do set VERSION=%%i
set NODE_ENV=development
electron --no-sandbox --trace-warnings ./