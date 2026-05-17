# Search Root-Cause Regression — 2026-05-17

The 2026-05-17 title-search bug (typing `loader` against `OSKOS-51 Telescopic
loader — delivery & install` returned 0 results) was a server-side
indexing/version-skew issue. It cannot be reliably regression-tested in Jest —
a pure-TS test cannot exercise the Elasticsearch round-trip.

## Root cause (recorded for future PRs)

- `common/scripts/version.txt` was at `0.7.422`. The local deployment had
  forced workspace migrations to `MODEL_VERSION=0.7.423` via compose env, so
  the workspaces' persisted `core:class:Version` document was on `0.7.423`.
- The fulltext-pod, built from this codebase, embedded model version `0.7.422`
  into `pods/fulltext/bundle/model.json` at build time.
- Every Tx coming from a `0.7.423` workspace was dropped by the fulltext-pod
  with a `wrong version` warning, so new issues were never indexed and search
  returned empty results for them.

Companion issue spotted during the investigation: `huly_v7-redpanda-1` had
exited at 07:06 UTC on the same day, leaving the fulltext-pod unable to
consume from the queue at all for ~3h. Restarting it cleared the queue
backlog.

## How to re-verify before merging any PR that touches:

- `foundations/server/packages/elastic/src/adapter.ts`
- `pods/fulltext/**`
- `models/server-tracker/**`
- `plugins/view-resources/src/components/filter/**`
- The SearchInput / SearchInputAdvanced wire-contract
- `common/scripts/version.txt`

Run the live verification described in
`docs/superpowers/plans/2026-05-17-tracker-search-rootcause-fix.md` Task 6:
typing `loader` in the Tracker Lupe must return `OSKOS-51` within 500 ms in
the gamedesigndemov3 workspace's Ostrowo Kościelne project.

ES-level direct verification (`docker exec huly_v7-elastic-1 curl -s -X POST
"localhost:9200/huly_storage_index_v2/_search" -H "Content-Type:
application/json" -d '{"query":{"multi_match":{"query":"loader","fields":[
"searchTitle","fulltextSummary","identifier"]}}}'`) must return ≥1 hit
identified as `OSKOS-51` in the affected workspace.

## Future-prevention

A version-skew detector in the deploy pipeline should refuse to publish a pod
image whose compiled `model.json` patch differs from the workspace's stored
patch by more than 0. Tracked separately; out of scope for this PR.
