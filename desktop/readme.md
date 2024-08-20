## electron-builder

The `package.json` has a `build` section for running
[electron-builder](https://www.electron.build/).  I didn't add it
to this project's dependency list because many people prefer to install
it globally.  If you do not wish to use electon-builder, simply
disregard or remove the `build` section from `package.json`.

Note that this project's build configuration overrides the default
output directory to be `deploy` instead of `dist`, since `dist` is
already being used for the transpilation target.  The `dist` directory
is the **source** for electron-builder.
