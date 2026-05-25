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
              {#each visibleEntries as e (e.id)}
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
                  <td><pre>{e.details != null ? JSON.stringify(e.details, null, 2) : ''}</pre></td>
                </tr>
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
</style>
