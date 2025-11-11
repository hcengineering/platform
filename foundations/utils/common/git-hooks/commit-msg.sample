#!/bin/sh
#
# This is an example Git hook for use with Rush.  To enable this hook, rename this file
# to "commit-msg" and then run "rush install", which will copy it from common/git-hooks
# to the .git/hooks folder.
#
# TO LEARN MORE ABOUT GIT HOOKS
#
# The Git documentation is here: https://git-scm.com/docs/githooks
# Some helpful resources: https://githooks.com
#
# ABOUT THIS EXAMPLE
#
# The commit-msg hook is called by "git commit" with one argument, the name of the file
# that has the commit message.  The hook should exit with non-zero status after issuing
# an appropriate message if it wants to stop the commit.  The hook is allowed to edit
# the commit message file.

# This example enforces that commit message should contain a minimum amount of
# description text.
if [ `cat $1 | wc -w` -lt 3 ]; then
  echo ""
  echo "Invalid commit message: The message must contain at least 3 words."
	exit 1
fi
