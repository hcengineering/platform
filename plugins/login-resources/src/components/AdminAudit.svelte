<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { onMount } from 'svelte'
  import { Breadcrumb, Button, EditBox, Header, Scroller } from '@hcengineering/ui'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { getAccountClient } from '../utils'
  import type { AuditEntry, ListAuditAdminParams } from '@hcengineering/account-client'
  import type { AccountUuid, WorkspaceUuid } from '@hcengineering/core'
  import AdminShell from './admin-shell/AdminShell.svelte'
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
            <EditBox bind:value={filterAdmin} placeholder={getEmbeddedLabel('Admin UUID')} kind="editbox" />
            <EditBox bind:value={filterAction} placeholder={getEmbeddedLabel('Action (e.g. disable, archive_workspace)')} kind="editbox" />
            <EditBox bind:value={filterTargetAcc} placeholder={getEmbeddedLabel('Target account UUID')} kind="editbox" />
            <EditBox bind:value={filterTargetWs} placeholder={getEmbeddedLabel('Target workspace UUID')} kind="editbox" />
            <input type="date" bind:value={filterFrom} />
            <input type="date" bind:value={filterTo} />
            <Button kind="primary" label={getEmbeddedLabel('Apply')} on:click={() => { void reload(true) }} />
          </div>

          <table class="audit-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {#each entries as e (e.id)}
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
                <tr><td colspan="5" class="audit-empty">No audit entries match the current filter.</td></tr>
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

    input[type="date"] {
      padding: 0.35rem 0.5rem;
      border: 1px solid var(--theme-divider-color);
      border-radius: 0.35rem;
      background: var(--theme-bg-color);
      color: var(--theme-content-color);
    }
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

    .audit-empty {
      text-align: center;
      color: var(--theme-darker-color);
      padding: 1.5rem;
    }
  }

  .audit-pager {
    display: flex;
    justify-content: center;
    margin-top: var(--spacing-2);
  }
</style>
