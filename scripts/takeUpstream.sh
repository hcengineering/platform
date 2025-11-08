#!/bin/bash

git subtree pull --prefix=foundations/utils git@github.com:hcengineering/huly.utils.git main
git subtree pull --prefix=foundations/core git@github.com:hcengineering/huly.core.git main
git subtree pull --prefix=foundations/server git@github.com:hcengineering/huly.server.git main
git subtree pull --prefix=foundations/net git@github.com:hcengineering/huly.net.git main

git subtree pull --prefix=foundations/hulylake git@github.com:hcengineering/hulylake.git master
git subtree pull --prefix=foundations/hulypulse git@github.com:hcengineering/hulypulse.git main
git subtree pull --prefix=foundations/communication git@github.com:hcengineering/communication.git main
