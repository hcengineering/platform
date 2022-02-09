# Project templates

Folder contains a projeect templates and functionality to apply template values to all projects inside rush multi repo.

Any folder with package.json inside templates are template, so it is possible to apply it.

Templates will be matched using `peerDependencies` entries should be available inside dependencies of project template is matched against.

So ui template with peer dependency to `svelte`, will be matched to any UI plugin.

If no template is matched for project then `default` template will be used.

## Explicit template selection

If package.json contains "template" field, template from templates with matched name will be selected.

## Apply rules

- If file in template folder is pressent and file in project folder is not, it will be copied.
  - If package.json contain '#replaces' section with filename, file will be overriten in any case.
  - If filename in template starts with ~ then file in project will be removed instead of add.
- package.json
  - dependencies - will be updated to contain all values from template package.json dependencies with exact same versions.
  - devDependencies - will be updated to contain all values from template package.json dependencies with exact same versions.
  - scripts - will be updated to contain all values from template package.json dependencies with exact same versions.
