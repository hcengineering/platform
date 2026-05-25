<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { onMount } from 'svelte'
  import { Breadcrumb, Button, Header, Scroller } from '@hcengineering/ui'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { getAccountClient } from '../utils'
  import type { AuditEntry, ListAuditAdminParams } from '@hcengineering/account-client'
  import type { AccountUuid, WorkspaceUuid } from '@hcengineering/core'
  import AdminShell from './admin-shell/AdminShell.svelte'
  import AuditEmptyState from './admin-shell/AuditEmptyState.svelte'
  import setting from '@hcengineering/setting'

  let entries: AuditEntry[] = []
  let nextCursor: string | null = null
  let loading = false
  let filterAdmin = ''
  let filterAction = ''
  let filterTargetWs = ''
  let filterTargetAcc = ''
  let filterFrom = ''
  let filterTo = ''

  async function reload (resetCursor = true): Promise<void> {
    loading = true
    try {
      const params: ListAuditAdminParams = {
        filter: {
          adminUuid: filterAdmin.trim() !== '' ? filterAdmin.trim() as AccountUuid : undefined,
          action: filterAction.trim() !== '' ? filterAction.trim() : undefined,
          targetAccountUuid: filterTargetAcc.trim() !== '' ? filterTargetAcc.trim() as AccountUuid : undefined,
          targetWorkspaceUuid: filterTargetWs.trim() !== '' ? filterTargetWs.trim() as WorkspaceUuid : undefined,
          from: filterFrom !== '' ? new Date(filterFrom).getTime() : undefined,
          to: filterTo !== '' ? new Date(filterTo).getTime() : undefined
        },
        pagination: resetCursor ? { limit: 50 } : { cursor: nextCursor ?? undefined, limit: 50 }
      }
      const res = await getAccountClient(null).listAuditAdmin(params)
      entries = resetCursor ? res.entries : [...entries, ...res.entries]
      nextCursor = res.nextCursor
    } finally {
      loading = false
    }
  }

  onMount(() => {
    void reload()
  })

  $: hasFilter = filterAdmin.trim() !== '' || filterAction.trim() !== '' ||
                 filterTargetAcc.trim() !== '' || filterTargetWs.trim() !== '' ||
                 filterFrom !== '' || filterTo !== ''

  const PAGE_RENDER_CAP = 200  // hard ceiling on simultaneously-rendered rows
  // listAuditAdmin sorts ORDER BY ts_ms DESC (verified in
  // server/account/src/collections/postgres/postgres.ts) — entries[0] is
  // the NEWEST row. Slice from the head, not the tail.
  $: visibleEntries = entries.length > PAGE_RENDER_CAP
    ? entries.slice(0, PAGE_RENDER_CAP)
    : entries

  // Plan 1d Task 3 — Walk visibleEntries once into groups keyed by batchId so
  // consecutive same-batchId rows render under one non-interactive header.
  // Rows with no batchId remain singleton groups so the existing single-action
  // UX is unchanged. listAuditAdmin already orders DESC by (ts_ms, id), so
  // rows from one bulk call are guaranteed to be contiguous unless other
  // unrelated activity is interleaved at the same ts_ms — defensive: only
  // collapse when the same batchId is immediately adjacent.
  interface EntryGroup {
    batchId: string | null
    entries: AuditEntry[]
  }
  $: entryGroups = ((): EntryGroup[] => {
    const out: EntryGroup[] = []
    let current: EntryGroup | null = null
    for (const e of visibleEntries) {
      const bid = e.batchId ?? null
      if (current != null && bid != null && current.batchId === bid) {
        current.entries.push(e)
      } else {
        current = { batchId: bid, entries: [e] }
        out.push(current)
      }
    }
    return out
  })()

  let expandedDetails: Set<string> = new Set()
  function toggleDetails (id: string): void {
    expandedDetails = new Set(expandedDetails)
    expandedDetails.has(id) ? expandedDetails.delete(id) : expandedDetails.add(id)
  }
  function summary (details: unknown): string {
    if (details == null || typeof details !== 'object') return ''
    const keys = Object.keys(details as object)
    return `${keys.length} key${keys.length === 1 ? '' : 's'}`
  }
</script>

<AdminShell section="audit">
  <div class="hulyComponent">
    <Header adaptive="disabled">
      <Breadcrumb icon={setting.icon.AdminPanel} label={getEmbeddedLabel('Audit log')} size="large" isCurrent />
    </Header>

    <div class="hulyComponent-content__column content">
      <Scroller padding="var(--spacing-3)" bottomPadding="var(--spacing-3)">
        <div class="hulyComponent-content">

          <div class="audit-filter-bar">
            <input class="audit-filter-text" type="text" bind:value={filterAdmin}
                   placeholder="Admin UUID" />
            <input class="audit-filter-text" type="text" bind:value={filterAction}
                   placeholder="Action (disable, archive_workspace, …)" />
            <input class="audit-filter-text" type="text" bind:value={filterTargetAcc}
                   placeholder="Target account UUID" />
            <input class="audit-filter-text" type="text" bind:value={filterTargetWs}
                   placeholder="Target workspace UUID" />
            <input class="audit-filter-date" type="date" bind:value={filterFrom} aria-label="From date" />
            <input class="audit-filter-date" type="date" bind:value={filterTo} aria-label="To date" />
            <Button kind="primary" label={getEmbeddedLabel('Apply')} on:click={() => { void reload(true) }} />
          </div>

          {#if entries.length > PAGE_RENDER_CAP}
            <div class="audit-cap-notice" role="status">
              Showing the most recent {PAGE_RENDER_CAP} of {entries.length} loaded
              entries. Apply a filter to narrow the result set.
            </div>
          {/if}

          <table class="audit-table">
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Admin</th>
                <th scope="col">Action</th>
                <th scope="col">Target</th>
                <th scope="col">Details</th>
              </tr>
            </thead>
            <tbody>
              {#each entryGroups as g (g.batchId ?? g.entries[0].id)}
                {#if g.entries.length > 1}
                  <tr class="audit-batch-header">
                    <td colspan="5">
                      <strong>Bulk action by {g.entries[0].admin.firstName} {g.entries[0].admin.lastName}</strong>
                       — {g.entries.length} entries · <code>{g.entries[0].action}</code> ·
                       {new Date(g.entries[0].tsMs).toLocaleString()}
                    </td>
                  </tr>
                {/if}
                {#each g.entries as e (e.id)}
                  <tr>
                    <td>{new Date(e.tsMs).toLocaleString()}</td>
                    <td>{e.admin.firstName} {e.admin.lastName}</td>
                    <td><code>{e.action}</code></td>
                    <td>
                      {#if e.targetAccount != null}
                        {e.targetAccount.firstName} {e.targetAccount.lastName}
                      {:else if e.targetWorkspace != null}
                        {e.targetWorkspace.name || e.targetWorkspace.url}
                      {/if}
                    </td>
                    <td>
                      {#if e.details != null}
                        {#if expandedDetails.has(e.id)}
                          <pre class="audit-details-expanded">{JSON.stringify(e.details, null, 2)}</pre>
                          <button class="audit-details-toggle" on:click={() => toggleDetails(e.id)}>Collapse</button>
                        {:else}
                          <button class="audit-details-toggle" on:click={() => toggleDetails(e.id)}>
                            {summary(e.details)} — expand
                          </button>
                        {/if}
                      {/if}
                    </td>
                  </tr>
                {/each}
              {/each}
              {#if entries.length === 0 && !loading}
                <tr><td colspan="5"><AuditEmptyState {hasFilter}
                    on:clearFilter={() => {
                      filterAdmin = ''; filterAction = ''; filterTargetAcc = '';
                      filterTargetWs = ''; filterFrom = ''; filterTo = '';
                      void reload(true)
                    }} /></td></tr>
              {/if}
            </tbody>
          </table>

          {#if nextCursor != null}
            <div class="audit-pager">
              <Button kind="regular" label={getEmbeddedLabel('Load more')} on:click={() => { void reload(false) }} />
            </div>
          {/if}

        </div>
      </Scroller>
    </div>
  </div>
</AdminShell>

<style lang="scss">
  .audit-filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
    margin-bottom: var(--spacing-2);
  }

  .audit-filter-text,
  .audit-filter-date {
    flex: 1 1 14rem;
    min-width: 0;
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.35rem;
    background: var(--theme-bg-color);
    color: var(--theme-content-color);
    font-size: 0.85rem;
    font-family: inherit;

    &:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: -2px;
    }
  }

  .audit-filter-date {
    flex: 0 0 11rem;
  }

  .audit-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
    background: var(--theme-bg-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--small-BorderRadius);
    overflow: hidden;

    th, td {
      padding: 0.5rem 0.75rem;
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid var(--theme-divider-color);
    }

    th {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--theme-darker-color);
      background: var(--theme-bg-accent-color);
    }

    code {
      font-family: var(--mono-font, 'SF Mono', monospace);
      font-size: 0.8rem;
    }

    pre {
      margin: 0;
      font-family: var(--mono-font, 'SF Mono', monospace);
      font-size: 0.72rem;
      color: var(--theme-darker-color);
      max-width: 28rem;
      white-space: pre-wrap;
    }
  }

  .audit-pager {
    display: flex;
    justify-content: center;
    margin-top: var(--spacing-2);
  }

  .audit-cap-notice {
    padding: 0.5rem 0.75rem;
    margin-bottom: var(--spacing-2);
    background: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.35rem;
    font-size: 0.85rem;
    color: var(--theme-darker-color);
  }

  // Plan 1d Task 3 — Non-interactive batch-grouping header for bulk actions.
  // No buttons here; reverse-batch CTA is explicitly deferred to Plan 1f.
  .audit-batch-header td {
    background: var(--theme-bg-accent-color);
    padding: 0.4rem 0.75rem;
    font-size: 0.78rem;
    color: var(--theme-darker-color);
    border-top: 2px solid var(--theme-divider-color);
  }

  .audit-details-toggle {
    background: none;
    border: 1px dashed var(--theme-divider-color);
    border-radius: 0.25rem;
    padding: 0.15rem 0.4rem;
    font-size: 0.78rem;
    color: var(--theme-darker-color);
    cursor: pointer;
    &:hover { color: var(--theme-content-color); border-color: var(--theme-content-color); }
  }
  .audit-details-expanded {
    margin: 0 0 0.25rem 0;
    font-family: var(--mono-font, 'SF Mono', monospace);
    font-size: 0.72rem;
    color: var(--theme-darker-color);
    white-space: pre-wrap;
    max-width: 28rem;
  }
</style>
