# Keeping package.json content in sync with platform-rig profile

Every package.json with entry 

```
"extends": "@anticrm/platform-rig/profiles/{profile}"
```

could be updated to include latest values of package.json file in platform-rig profiles folder.

Rush command: `inject-extends` could be used for this purpuse.

It wil update/append entries from appropriate `profiles/{template}/package.json` file and merge value of dependencies/devDependencies/scripts sections into target package.
