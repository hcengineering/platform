# Important Notice

**This repository is not a standalone project** and is intended to be used **only** as a submodule within https://github.com/hcengineering/platform.

There is no separate CI, release pipeline, or independent build in this directory.
All install and build commands must be run from the root of the main repository (for example: rush install && rush build).
Changes in this folder will not take effect unless the parent repository initializes and updates this submodule.


Cloning this repository by itself will not provide the full dependency structure. To set everything up correctly, clone and initialize https://github.com/hcengineering/platform.
