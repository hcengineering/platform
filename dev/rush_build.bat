@echo off
:: Save the current directory
set current_dir=%cd%

:: Change to the directory where the script is located (dev)
cd /d %~dp0

:: Run the commands
rush build
rush rebuild
rush bundle
rush package
rush validate
rush svelte-check  :: Optional
rush docker:build
rush docker:up

:: Return to the original directory
cd /d %current_dir%
