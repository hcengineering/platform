# External Pods Integration

A container for integrating external Docker images into the build process.

Implements two entry points consumed by the Rush build process: "docker:build" and "docker:push".

## docker:build

Imports external images into the local registry. The `services.d/` directory contains files that describe external images. A 'local' tag is applied to imported images.

## docker:push

Copies external images into the official registry (hardcoreeng). A git-based `git describe --tags --abbrev=0` tag is applied to copied images.

## Configuration

Each file in the `services.d/` directory describes a single external image. Only the first line in every file is used. The line should follow this format:

```
<repository> <external_registry>/<repository>:<tag>
```

If the file name starts with "-", it will be ignored. Lines starting with "#" are also ignored.

## More information

More details are available in the [Design Document](https://app.hc.engineering/workbench/platform/document/external-services-build-682232fa8c2a2eb48ffe47d5)
