<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { Loading, Scroller } from '@hcengineering/ui'
  import { getAccountClient } from '../../utils'
  import type { WorkspaceMembersAdminResponse } from '@hcengineering/account-client'

  export let workspaceUuid: string

  const dispatch = createEventDispatcher()
  const client = getAccountClient()

  let data: WorkspaceMembersAdminResponse | undefined
  let loading = true
  let err: string | null = null

  async function load (): Promise<void> {
    loading = true
    err = null
    try {
      data = await client.getWorkspaceMembersAdmin(workspaceUuid as any)
    } catch (e: any) {
      err = e?.message ?? String(e)
    } finally {
      loading = false
    }
  }
  onMount(load)

  function close (): void { dispatch('close') }
</script>

<div class="drawer">
  <div class="header">
    <button class="back" on:click={close}>←</button>
    {#if data}
      <div class="title">{data.workspaceName}</div>
      <div class="sub">{data.workspaceUrl} · {data.workspaceMode}</div>
    {/if}
    <button class="close" on:click={close}>×</button>
  </div>
  <Scroller>
    {#if loading}
      <Loading />
    {:else if err}
      <div class="error">{err}</div>
    {:else if data}
      <div class="section">
        <div class="section-h">Members ({data.members.length})</div>
        {#each data.members as m (m.accountUuid)}
          <div class="row">
            <div class="name">
              {m.firstName} {m.lastName}
              {#if m.isAdmin}<span class="badge">Admin</span>{/if}
              {#if m.status === 'disabled'}<span class="badge red">Disabled</span>{/if}
            </div>
            <div class="email muted">{m.primaryEmail ?? '—'}</div>
            <div class="role">{m.role}</div>
          </div>
        {/each}
      </div>
    {/if}
  </Scroller>
</div>

<style lang="scss">
  .drawer { position: fixed; right: 0; top: 0; bottom: 0; width: 28rem; background: var(--theme-bg-color); border-left: 1px solid var(--theme-divider-color); box-shadow: -2px 0 16px rgba(0,0,0,0.08); z-index: 30; display: flex; flex-direction: column; }
  .header { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; border-bottom: 1px solid var(--theme-divider-color); }
  .back, .close { background: transparent; border: 0; cursor: pointer; font-size: 1.2rem; color: var(--theme-content-color); }
  .title { font-weight: 600; flex: 1; }
  .sub { font-size: 0.75rem; color: var(--theme-darker-color); }
  .section { padding: 0.5rem 1rem; }
  .section-h { font-weight: 600; margin: 0.75rem 0 0.4rem; color: var(--theme-darker-color); }
  .row { display: grid; grid-template-columns: 1fr auto; gap: 0.25rem 0.75rem; padding: 0.4rem 0; border-bottom: 1px solid var(--theme-divider-color); align-items: center; }
  .email { grid-column: 1; font-size: 0.8rem; }
  .role { grid-column: 2; grid-row: 1 / span 2; }
  .badge { padding: 0.05rem 0.4rem; border-radius: 999px; font-size: 0.7rem; margin-left: 0.25rem; background: rgba(245,158,11,0.12); color: #b45309; }
  .badge.red { background: rgba(239,68,68,0.12); color: #dc2626; }
  .muted { color: var(--theme-darker-color); }
  .error { padding: 1rem; color: var(--theme-error-color, #ef4444); }
</style>
