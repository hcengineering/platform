# Overview

A configuration guide, for self-hosted users.

## Disable features
Installation could have force disabled one of unused features for all workspaces.

Please set a DISABLED_FEATURES environment variable for front service container, a comma separated list is supported.

- auto-translate - Will disable auto translate
- github - Will disable Github
- mailboxes - Will disable Huly Mail
- export - Will disable export
- integration - Will disable all integrations
- backup - Will disable backup UI
- invites - Will disable invites UI
- documents - Will disable Control Documents
- calendar - Will disable Calendar UI
- inventory - Will disable inventory
- survey - Will disable Surveys
- lead - Will disable leada
- products - Will disable products
- telegram - Will disable telegram
- recruit - Will disable Recruit
- training - Will disable trainings
- testManagement - Will disable test management
- process - Will disable process module
- cards - Will disable cards

## Per-branding disabled features

When serving multiple brands/hosts from one installation (see `BRANDING_URL`),
features can also be disabled per host by adding a `disabledFeatures` key
(same comma-separated format) to a branding entry. The lists from
`DISABLED_FEATURES` and the matched branding are merged, so the environment
variable acts as the installation-wide baseline and brandings can only extend
it:

```json
{
  "tracker.example-client.com": {
    "title": "Example Client Tracker",
    "disabledFeatures": "recruit,lead,inventory,training"
  }
}
```
