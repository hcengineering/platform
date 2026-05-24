<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import {
    Button,
    DropdownLabelsIntl,
    Loading,
    Scroller,
    showPopup,
    type DropdownIntlItem
  } from '@hcengineering/ui'
  import { MessageBox } from '@hcengineering/presentation'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { AccountRole } from '@hcengineering/core'
  import { getAccountClient } from '../../utils'
  import type { WorkspaceMembersAdminResponse } from '@hcengineering/account-client'
  import AddMemberToWorkspacePopup from './AddMemberToWorkspacePopup.svelte'

  export let workspaceUuid: string

  const dispatch = createEventDispatcher()
  const client = getAccountClient()

  let data: WorkspaceMembersAdminResponse | undefined
  let loading = true
  let err: string | null = null

  const roleItems: DropdownIntlItem[] = [
    { id: AccountRole.Owner as any, label: getEmbeddedLabel('Owner') },
    { id: AccountRole.Maintainer as any, label: getEmbeddedLabel('Maintainer') },
    { id: AccountRole.User as any, label: getEmbeddedLabel('User') },
    { id: AccountRole.Guest as any, label: getEmbeddedLabel('Guest') }
  ]

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

  function close (): void {
    dispatch('close')
  }

  async function onChangeRole (accountUuid: string, role: AccountRole): Promise<void> {
    try {
      await client.setWorkspaceMemberRole({
        accountUuid: accountUuid as any,
        workspaceUuid: workspaceUuid as any,
        newRole: role
      })
      await load()
    } catch (e: any) {
      err = e?.message ?? String(e)
    }
  }

  function onRemove (accountUuid: string, displayName: string): void {
    // PR-B's MessageBox pattern: pass an `action` callback that fires only
    // when the user clicks Confirm. dangerous: true gives the red button.
    showPopup(MessageBox, {
      label: getEmbeddedLabel('Remove member from workspace'),
      message: getEmbeddedLabel(
        `Remove ${displayName} from ${data?.workspaceName ?? 'this workspace'}? They lose access immediately.`
      ),
      okLabel: getEmbeddedLabel('Remove'),
      dangerous: true,
      action: async () => {
        await client.removeWorkspaceMember({
          accountUuid: accountUuid as any,
          workspaceUuid: workspaceUuid as any
        })
        await load()
      }
    })
  }

  function openAddMember (): void {
    // The popup dispatches `close` with `true` on success, `undefined` on
    // cancel — matches the close-with-payload convention used by
    // AddToWorkspacePopup / CreateAccountPopup.
    showPopup(AddMemberToWorkspacePopup, { workspaceUuid }, 'middle', async (added) => {
      if (added === true) await load()
    })
  }
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
            <div class="role">
              <DropdownLabelsIntl
                items={roleItems}
                selected={m.role as any}
                on:selected={(e) => onChangeRole(m.accountUuid, e.detail)}
              />
            </div>
            <!-- pass a human-readable label so the confirmation can name the member -->
            <button
              class="rm"
              on:click={() =>
                onRemove(
                  m.accountUuid,
                  `${m.firstName} ${m.lastName}`.trim() || m.primaryEmail || m.accountUuid
                )}
            >
              ✕
            </button>
          </div>
        {/each}
        <div class="add-row">
          <Button label={getEmbeddedLabel('Add member')} on:click={openAddMember} />
        </div>
      </div>
    {/if}
  </Scroller>
</div>

<style lang="scss">
  .drawer {
    position: fixed;
    right: 0;
    top: 0;
    bottom: 0;
    width: 28rem;
    background: var(--theme-bg-color);
    border-left: 1px solid var(--theme-divider-color);
    box-shadow: -2px 0 16px rgba(0, 0, 0, 0.08);
    z-index: 30;
    display: flex;
    flex-direction: column;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--theme-divider-color);
  }
  .back,
  .close {
    background: transparent;
    border: 0;
    cursor: pointer;
    font-size: 1.2rem;
    color: var(--theme-content-color);
  }
  .title {
    font-weight: 600;
    flex: 1;
  }
  .sub {
    font-size: 0.75rem;
    color: var(--theme-darker-color);
  }
  .section {
    padding: 0.5rem 1rem;
  }
  .section-h {
    font-weight: 600;
    margin: 0.75rem 0 0.4rem;
    color: var(--theme-darker-color);
  }
  .row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 0.25rem 0.75rem;
    padding: 0.4rem 0;
    border-bottom: 1px solid var(--theme-divider-color);
    align-items: center;
  }
  .email {
    grid-column: 1;
    font-size: 0.8rem;
  }
  .role {
    grid-column: 2;
    grid-row: 1 / span 2;
  }
  .rm {
    grid-column: 3;
    grid-row: 1 / span 2;
    background: transparent;
    border: 0;
    cursor: pointer;
    color: var(--theme-darker-color);
    font-size: 1rem;
    padding: 0.25rem 0.4rem;
    border-radius: 0.25rem;
  }
  .rm:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #dc2626;
  }
  .add-row {
    display: flex;
    justify-content: flex-end;
    padding: 0.75rem 0;
  }
  .badge {
    padding: 0.05rem 0.4rem;
    border-radius: 999px;
    font-size: 0.7rem;
    margin-left: 0.25rem;
    background: rgba(245, 158, 11, 0.12);
    color: #b45309;
  }
  .badge.red {
    background: rgba(239, 68, 68, 0.12);
    color: #dc2626;
  }
  .muted {
    color: var(--theme-darker-color);
  }
  .error {
    padding: 1rem;
    color: var(--theme-error-color, #ef4444);
  }
</style>
