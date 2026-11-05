<!--
Copyright © 2026 TraceX SAS.
Licensed under the Eclipse Public License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy at https://www.eclipse.org/legal/epl-2.0 .
Distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND.
-->

# Definition packages, releases and upgrades

Status: local file creation, installation, reviewed updates and an installation-scoped catalog are implemented in source. The catalog runs as a separate pod. Keep the current process editor and runtime behavior.

## Scope

Marketplace owns package metadata, release creation, versioning, file serialization, change analysis and the export dialog. The existing process plugin owns YAML compilation and execution. Cards and processes provide definitions to Marketplace through their export menus. Local package management is available in workspace settings. Catalog publication and discovery use the standalone `pod-marketplace` service.

- A package contains a card module with its processes, a standalone process template, or a bundle of standalone process templates.
- One author-scoped package identity and SemVer release cover the whole package.
- YAML stays at `version: 2`; package versions and business-card data versions are independent.
- Processes remain editable in place. Executions continue referencing the same process and graph documents, as they do today. Package updates can affect running executions.
- Do not introduce process publication, immutable execution revisions, runtime pinning, generic transaction validators or server-core changes for package versioning.
- Begin with downloadable release files and manually reviewed updates. Marketplace distribution can use the same release format later.

## Agreed catalog and author identity boundary

The first Marketplace catalog belongs to one TraceX installation and is shared by its workspaces using the same account service. Independent installations have independent catalogs. The account service is the identity authority for that catalog.

- Package ownership uses the existing global `AccountUuid` from that installation's account service. It remains stable across workspaces; workspace social IDs, display names and email addresses are not ownership keys.
- Publication and new-release permissions must be checked by the catalog service against the authenticated account and the recorded package owner. The `author` field in a supplied release file is attribution, not proof of ownership.
- Show the author's profile name, with a short account identifier as a fallback when no name is available.
- An email address is optional contact information shown only with the author's explicit consent. Missing or changed email does not prevent publication or change package ownership.
- Installing or editing a package preserves its original author. Importing a file from another installation does not associate its author with a local account or grant permission to publish updates under that identity.

A future external catalog would use its own authenticated publisher accounts and require explicit account linking or ownership transfer. That is outside the first version; email matching must not establish ownership.

Continue planning and implementation in this order: installation from a release file, reviewed updates from a release file, catalog publication and discovery, then installation and updates through the catalog. Both delivery paths use the same package format and workspace installation/update logic. The existing export actions keep their current role in producing release files.

## Process bundles

A process-only package may contain one or more standalone processes under one package ID, author, description and release version. A single-process package is the smallest instance of this model. Bundles use the existing `version: 2`, `kind: process` document with multiple named entries in `processes`. The compiler accepts one or more processes; the ordinary single-process editor and import route still require exactly one. Package files are detected at the existing file import entry points and use the Marketplace installation dialog.

- Package creation allows selecting multiple processes. Persist that membership so creating a new package version includes the recorded set without selecting the processes again. Adding or removing a member is an explicit package composition change.
- Installation creates the full bundle as one installation. Each process has a destination card type and its own bindings; the UI may assign one destination to the whole set when compatible. A bundle can serve multiple existing card types without creating those types.
- Bindings remain scoped to their process. Matching slot names alone do not establish a shared requirement; reuse a binding only when the destination and required contracts are compatible and the mapping is explicit.
- Resolve references between bundled processes to the corresponding local processes of the same installation. External dependencies remain explicit required bindings. Allocate the internal identity mapping for the complete set before resolving cross-process references.
- Bundling groups installation and release management. Execution and subprocess calls retain their existing explicit engine behavior; membership does not make processes execute together.
- Updates compare each process graph as a whole, preserve local-only edits and expose conflicts per process. The package version advances only after the complete reviewed update succeeds. Removing a process is reported as a destructive change and follows the existing removal policy.
- Installing the bundle again creates a separate installation with independent local identities and bindings.

## Current implementation

Available:

- Plain `.package.yaml` files: `version: 2`, `kind`, package metadata, `contentHash`, and the actual `cardTypes`/`processes` definition sections. YAML is never embedded as a quoted string inside JSON.
- Release parsing, hash verification, SemVer checks and read-only comparison.
- Component and whole-process graph comparison, including ordered branches/actions and local customization conflicts.
- `Make package` and `Create new package version` actions in both card-module and standalone-process export menus.
- One shared export dialog that records package ID, version, author, description and composition on the definitions and downloads a package YAML file.
- Installation of complete card modules or process bundles, independent repeated installations, saved baselines and bindings, reviewed updates and disconnection through workspace settings.

Export updates only package metadata on its recorded owners (`definitionPackage: {id, version, author, description, members?}`); it does not rewrite card schemas or process graphs. Membership is workspace-local and omitted from the release manifest. Ordinary JSON/YAML imports keep their existing behavior; package files use the separate installation flow. Exporting a release never applies an update to an installation.

## Version and identity rules

A catalog package is identified by the pair `(author AccountUuid, package.id)`. A release adds its version and content hash. The human-readable prefix inside a file ID is not an authenticated publisher namespace. Content cannot change under the same release version. The hash detects changes; it does not verify publisher identity.

Component keys identify package contents. Display labels are not identities. A future update path must retain compatible native references and stored attribute names; matching labels alone cannot authorize overwriting workspace definitions.

The export dialog assigns `1.0.0` initially and advances the patch number for each new release. These automatic release numbers do not classify compatibility. The destination diff decides whether an update can be applied; a patch number is not evidence that a change preserves data or behavior.

## Update rules

| Change | Review and application policy |
| --- | --- |
| Supported label, description or icon | Nondestructive candidate; preserve local edits |
| Supported optional field without defaults or constraints | Nondestructive addition candidate; check destination bindings |
| Independent supported type or enum | Addition candidate; check references and local conflicts |
| Process graph, threshold, action order or recipients | Behavioral change; show the diff and require manual review |
| Defaults, permissions or write restrictions | Manual review of behavior and access |
| Field type, stored name, owner or Ref target | Destructive; require an implemented migration |
| Required field, tighter constraints or relationship cardinality | Destructive; check existing data and require a migration |
| Removal of a component or enum value | Destructive; check existing data and references |
| Unknown native properties or unsupported contracts | Unverified; establish support before application |

Process changes use the existing in-place update behavior. Preview must explain that current executions can observe the edited graph. There is no promise of preserving the old graph and no check that all executions have finished.

Destructive changes are reported but their application remains blocked until the relevant migration is implemented. Manual confirmation cannot supply a missing data transformation. Automatic application stays disabled (`canAutoApply: false`).

## Local customization

The offline analyzer compares previous release B, local YAML L and incoming release N using logical package identities:

- N equals B: preserve L.
- L equals B: use N after destination checks.
- L equals N: accept the converged change.
- Both changed differently: show a conflict and require resolution before update.

Treat a process graph, context and bindings as one comparison unit. Preserve branch/action order and ignore only documented audit metadata and regenerated ranks. Do not merge action arrays by position. Local deletion is a local edit, not permission for implicit data deletion.

## Available APIs and commands

`@hcengineering/marketplace` exports `createDefinitionPackageRelease`, `parseDefinitionPackageRelease`, `serializeDefinitionPackageRelease`, `compareDefinitionPackageVersions`, `planDefinitionPackageUpgrade`. Release verification recompiles the YAML instead of trusting derived documents supplied by a caller.

From `plugins/marketplace`, after normal compiler artifacts have been refreshed:

```bash
node scripts/package-plan.js --help
node scripts/package-plan.js release acme/procurement 1.0.0 ../process/docs/examples/procurement-workspace.card.yaml > /tmp/procurement-1.0.0.package.yaml
node scripts/package-plan.js compare /tmp/procurement-1.0.0.package.yaml /tmp/procurement-1.1.0.package.yaml
```

Create the second release from changed YAML before comparison. Append a local YAML path to compare customization. The CLI emits YAML for package releases and JSON for comparison reports. It is read-only and never builds or applies definitions. Exit codes: 0 for a valid release, unchanged model or compatible candidate; 1 for review-required changes/conflicts; 2 for invalid input, file errors or missing artifacts.

### Export actions

In the card type settings or process editor, open the existing export menu:

- `Make package`: available for definitions without a package. Edit the optional package description and export. An internal unique ID is generated automatically, the first version is `1.0.0`, and the current account UUID becomes the author. Package metadata is saved on the definition using the structural `DefinitionPackageOwner` contract owned by Marketplace; card/process API and model classes declare no package fields.
- `Create new package version`: offered only to the recorded author. Edit the saved description if needed and export. The existing ID is retained and the patch version is advanced automatically. No file, package ID or version is requested from the user. Other users see no package version action.

The author is checked again before export. A new version must retain package identity and authorship; equal versions, downgrades and build-metadata-only version changes are rejected. Saving package metadata happens before initiating the download; a failed metadata write does not start a download. The downloaded filename includes the package ID and version and ends in `.package.yaml`. Metadata and the definition are ordinary YAML mappings in one document; there is no `source` string or JSON wrapper. Compiled model documents are derived when read.

The card exporter includes its embedded processes through the existing module export. An embedded process inherits its master tag's package unless it has an explicit standalone package. Its version action exports the complete card module and updates the card type's package version. Standalone exports retain existing slots and bindings behavior. Package metadata survives YAML saves and workspace reloads; it is omitted from definition payloads so release version changes do not create false definition diffs. The release manifest retains authorship under the content hash. `author` is `getCurrentAccount().uuid`, the global account UUID; workspace-specific social IDs and definition creators are not used. Previously exported JSON envelopes and files without an author or description remain readable. New exports always use plain YAML. The hash covers package metadata and canonical YAML definition data, preserving block order and literal values while ignoring comments and formatting. Legacy JSON hashes over source bytes are verified before normalization. SHA-256 is calculated by the bundled `fast-sha256` library, so export and verification work on ordinary HTTP origins without Web Crypto or a secure-context requirement. The digest remains SHA-256. These actions create no new collections, jobs, installation records or server commands.

## Workspace installations and updates

One `DefinitionPackageInstallation` document in the Marketplace domain records the display name, release manifest, original package YAML, logical-to-local identity mapping and per-process destinations/bindings. Owning definitions keep a small installation reference. These are installation baselines; process execution continues using the existing mutable graph documents.

- Install packages from the card/process file import menus or **Marketplace** in workspace settings. Preview the contents and choose existing card types and external bindings for process bundles. Card modules create their own definitions with fresh local identities; they do not adopt arbitrary existing card types.
- A typed process slot whose saved binding refers to another member is resolved inside the same installation. Keep its owner/type contract and validate it against that member's selected destination; equal slot names never imply shared bindings. Other slots require explicit destination bindings.
- Allocate mappings for all documents and graph-owned identities before binding members. Repeated installation creates an independent record and object set. When a package is already installed, the import dialog offers its existing installations for update or an explicit additional instance.
- The installation record and definitions are written in one conditional workspace batch using ordinary platform CRUD. Package creation and installation use no dedicated server preparation API or jobs.
- An update compares the saved baseline, actual local definitions and incoming release after binding to stable local identities. Each process graph remains one merge unit. Preserve local-only edits; divergent changes require an explicit local/upstream choice. Destructive and unknown changes remain blocked. Check the actual local-to-target transition as well: choosing a cosmetic upstream edit must not revert a locally changed field type without a migration. The incoming author, package identity and definition kind must match the baseline.
- Update preview is invalidated when destinations or bindings change. Applying rechecks the local snapshot and adds existing transaction conditions for the installation, read documents, newly created identities and unexpected graph/field additions. Advance the stored release only with the complete update.
- Typed internal process dependencies must still exist after conflict resolution. Local edits are preserved by default; the review can explicitly restore a package version of a locally deleted member.
- Local YAML process edits preserve both package membership and the installation reference. Releasing a new version from installed author-owned definitions retains logical package identities. External workspace bindings are omitted from process package payloads; internal process bindings stay explicit.
- Disconnect removes the record and matching ownership links while retaining definitions, cards and runtime process data.

The installer accepts model-space definitions and identifier sequences (`core.class.Sequence` / `core.class.CustomSequence`) in `core.space.Workspace` inside card modules. New installations allocate independent counter identities and start them at zero. The writer preserves each validated document space. Update review loads existing counters outside ModelDb, ignores issued-number progress in definition diffs and retains their current values; unrelated package updates never reset numbering. Counter definition changes remain subject to the existing unknown/destructive-change checks. Process bundles support process graphs and enum dependencies; other model definitions belong in a card module. These limits are checked explicitly before any write. Unmanaged local objects whose native identities collide with new package components require explicit ownership reconciliation; the first version blocks adoption rather than creating parallel schema definitions. Review details render normalized native components as read-only YAML diffs; release files retain the named-block authoring DSL.

## Standalone catalog pod

`pods/marketplace` owns the HTTP routes, publication checks and PostgreSQL tables in its own `marketplace` schema. It does not add account-service methods or access account/workspace tables. The account service verifies existing global accounts and provides display names through its existing client. Deployment can use a separate database or the same PostgreSQL cluster with an independent schema.

- All catalog operations require a signed human-account token from the configured account authority. Shared guest, service, API-key and permission-grant tokens are rejected. The account is checked through the configured `ACCOUNTS_URL`; clients cannot supply another authority.
- Catalog routes share a per-IP limit of 300 requests per minute, enforced before account verification. Publication has an additional per-IP limit of 20 attempts per 15 minutes, before authentication and YAML parsing. Failed requests count too. Rejections return JSON with HTTP 429, `Retry-After` and standard rate-limit headers. Readiness and CORS preflight requests do not consume these quotas.
- Limits use the pod's in-memory store and reset on restart; replicas have independent budgets. A deployment requiring a shared quota must provide a shared rate-limit store or enforce it at ingress. Forwarded client IPs are trusted only when `TRUST_PROXY` explicitly lists trusted proxy addresses/CIDRs (comma-separated). Without that configuration, limits use the socket peer; behind an ingress this means a shared budget for that peer. Restrict direct pod access and list only the actual ingress addresses when configuring proxy trust.
- Publication parses and verifies the complete package YAML, including its digest, and compares the supplied author UUID with the authenticated account. Missing or foreign authors cannot publish. A file digest alone never establishes ownership.
- Catalog keys are `(author, id)`, so a copied artifact with another author cannot reserve the original author's ID. Existing file-upgrade checks still reject changing authors.
- Package visibility is `public` or `private` and applies to every release. Private packages are visible only to their authenticated global author, across that author's workspaces. SQL filters apply before list pagination; metadata, history and downloads return 404 for other accounts. Only the author can change visibility. Existing packages and new publications without a visibility header default to public; later publications without the header preserve the current visibility.
- A release version is insert-only. Identical retries return the recorded release without changing its contents or publication time. A conflicting payload returns 409. New releases retain the kind and must have greater SemVer precedence than the current latest version.
- Publication locks the package row inside a PostgreSQL transaction. Concurrent first publications and new versions cannot overwrite each other or move the latest version backwards.
- The catalog shows the latest description, author display name and optional explicitly supplied contact email to accounts allowed to see the package. Email is never queried or matched for ownership. Omitting the contact in a new release clears it from the catalog; identical retries preserve release metadata but apply an explicitly supplied visibility choice.
- The HTTP body for publication and download is the ordinary flat package YAML (`application/yaml`). JSON is used only for catalog summaries and error responses.

Routes:

| Method | Route | Result |
| --- | --- | --- |
| GET | `/health` | Readiness after storage initialization |
| GET | `/packages?search=&mine=true&offset=0&limit=30` | Latest entries; `mine` uses the authenticated UUID |
| GET | `/package?id=...&author=...` | Accessible package metadata, including visibility |
| PATCH | `/package?id=...&author=...` | Change visibility as the author; required `X-Marketplace-Visibility: public` or `private` header; no request body |
| GET | `/releases?id=...&author=...&offset=0` | Publication history, up to 50 releases per page |
| GET | `/release?id=...&author=...&version=...` | Package YAML; omitted version selects latest |
| POST | `/releases` | Publish package YAML; optional `X-Marketplace-Contact-Email` and `X-Marketplace-Visibility` headers |

Workspace settings now provide **Catalog**, **Installed packages** and **My publications**. Publish directly from the existing package export dialog, or select an already exported file from **My publications**. No package ID, version or previous file is requested when creating a new version. Publishing first saves the package metadata, then opens a publication dialog holding the fixed artifact for safe retries. Canceling publication does not undo local package version creation.

The publication dialog offers **Private package** and loads the current visibility for existing packages. New packages start with this option disabled. **My publications** offers **Make private** and **Make public** without creating a new release. Private packages carry a label in the catalog. Visibility controls future catalog access; it does not remove files already downloaded or definitions already installed in workspaces.

Catalog install and history actions download and verify the selected author/ID/version before opening the existing installation dialog. **Update from catalog** selects the latest release for the installation's original author and opens the same manual diff/merge review used for files. Publication never automatically updates any workspace. When `MARKETPLACE_URL` is absent, file operations remain available.

The package participates in the existing Rush bundle/Docker phases through its normal scripts. `dev/docker-compose.yaml` defines the service on port 4008. Runtime configuration requires `DB_URL`, `ACCOUNTS_URL` and `SERVER_SECRET`; optional `PORT` defaults to 4008. `SERVER_SECRET` must match the account authority. Expose the pod through the installation's normal ingress and set the browser-facing `MARKETPLACE_URL` on front. The dev/prod and desktop clients read this runtime setting.

Manual startup after reviewing the diff (do not run automatically):

```bash
rush build --to @hcengineering/pod-marketplace
rush docker:build --to @hcengineering/pod-marketplace
docker compose -f dev/docker-compose.yaml up -d marketplace
```

Refresh the model and browser bundles as usual. If front runs in Docker, its new `MARKETPLACE_URL` environment setting requires recreating front as part of the normal deployment. The dev server serves `dev/prod/public/config.json`; the root `dev/prod/config.json` is a separate local configuration.

PostgreSQL integration tests are opt-in: set `MARKETPLACE_TEST_DB_URL` to a disposable database named `tracex_marketplace_test` and run the pod tests. They never read production `DB_URL`. HTTP tests listen only on an ephemeral loopback port.

## Remaining implementation

1. Manually verify the file and catalog lifecycle in a workspace after refreshing dependency artifacts and starting the new pod.
2. Implement concrete supported schema migrations before enabling destructive updates.

Rollback requires checking that current schema/data still allow the previous definitions. It does not undo external process effects. Neither process execution migration nor general migration scripting is part of this scope.

## Verification

Use targeted tests, available diagnostics and `_phase:validate`; do not automatically build, format, commit or deploy. Check source-based TypeScript when normal dependency artifacts are stale. Unit tests do not replace manual workspace verification.

Manual scenarios:

- Start the standalone Marketplace pod, open Catalog and publish an authored package. Confirm it appears from a second workspace using the same account authority.
- Publish a second version without choosing the previous file. From the other workspace, open **Update from catalog** and verify that manual diff/conflict review is required.
- Retry the exact publication, submit changed content with the same version, and try another account's artifact. Confirm only the identical retry succeeds.
- Publish without email and with an explicitly entered email; confirm both work and the contact never changes ownership.
- Publish a private package and check it from two accounts: the author can list, inspect and download every version from any of their workspaces; the other account cannot discover it or access metadata, history or YAML even with a known ID, author and version.
- Switch an existing package between public and private in **My publications** without publishing a release. Confirm access changes for all versions and the publication timestamp remains unchanged. Publish a new version and retry an old-client publication without a visibility header; confirm privacy is preserved.
- Open publication history and install an older release as an independent instance. Confirm existing workspace definitions are not silently updated.

- Export a card type with an embedded process using `Make package`; verify the `.package.yaml` contains real definition blocks beside its metadata, can be parsed and passes hash validation. Confirm its author is the current global account UUID.
- Repeat for a standalone process and confirm its slots remain present.
- Create a package, reload the editor, and open `Create new package version` without selecting a file. Confirm identity is retained, the version advances automatically, the saved description is prefilled and the source reflects current edits.
- Sign in as another account and confirm the new-version action is absent; ordinary export remains available.
- Open an embedded process of a packaged card type. Confirm the version action exports the full card module and retains its package identity.
- Save YAML edits and confirm package ownership and version remain unchanged.
- Change or clear the description and confirm it is saved both on the definition and in the downloaded manifest.
- Export and verify a package on an ordinary HTTP origin with no `crypto.subtle`. Confirm it uses the same SHA-256 format as older releases.
- Compare label changes, optional-field additions, required/type changes and component removal: verify classifications.
- Compare a process threshold or branch-order change: manual behavioral review is required, with no execution-revision prerequisite.
- Compare conflicting and converged local edits: verify conflict handling and preserve local-only changes.
- Confirm export changes only package metadata and ordinary JSON/YAML export still works.
- Create a package with two processes, including a call between them; reload and create the next version from either member. Confirm the saved set is selected and internal calls remain inside the package.
- Install that package twice with independent bindings; verify distinct local identities and installation records. Check that incompatible destinations for an internal process slot are rejected.
- Make a local edit on one member and publish a change to another; update and confirm the local edit survives. Exercise divergent edits and both conflict choices.
- Try a field type change or component removal; confirm the update remains blocked. Change definitions after preview and confirm apply requires a fresh review.
- Install a card module, update a label or add an optional field, and confirm existing schema identities and card data remain intact. Disconnect and confirm the definitions remain editable.

## Implementation notes

- Local release creation, file and catalog installation, reviewed updates, disconnection and authenticated publication are implemented.
- Package creation remains an export action with metadata stored on its existing definitions. The Marketplace model adds one workspace installation class for baselines and bindings. It introduces no execution revisions, generic model validators, jobs, identity reservations or server preparation endpoints.
