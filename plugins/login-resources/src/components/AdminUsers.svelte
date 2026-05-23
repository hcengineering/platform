<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { onMount } from 'svelte'
  import { getAccountClient } from '../utils'
  import login from '@hcengineering/login'
  import setting from '@hcengineering/setting'
  import {
    Breadcrumb,
    Header,
    Scroller,
    SearchInput,
    DropdownLabelsIntl,
    Label,
    type DropdownIntlItem
  } from '@hcengineering/ui'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import AdminShell from './admin-shell/AdminShell.svelte'
  import AdminUsersTable from './admin-users/AdminUsersTable.svelte'
  import AdminUsersPagination from './admin-users/AdminUsersPagination.svelte'
  import AdminUsersDrawer from './admin-users/AdminUsersDrawer.svelte'
  import type { AccountListRow, ListAccountsAdminParams } from '@hcengineering/account-client'

  interface AdminFilter {
    search?: string
    authMethod?: 'all' | 'email_only' | 'oidc' | 'mixed'
    status?: 'all' | 'active' | 'disabled'
    workspaceUuids?: string[]
  }

  let filter: AdminFilter = { status: 'active' }
  let sort: ListAccountsAdminParams['sort'] = { field: 'name', direction: 'asc' }
  let offset = 0
  const limit = 50

  let accounts: AccountListRow[] = []
  let total = 0
  let loading = false
  let selectedUuid: string | null = null
  let errorMessage: string | null = null

  let search = ''
  let debounceTimer: ReturnType<typeof setTimeout> | undefined

  $: counts = {
    active: accounts.filter((a) => a.status === 'active').length,
    disabled: accounts.filter((a) => a.status === 'disabled').length,
    admins: accounts.filter((a) => a.isAdmin).length
  }

  $: {
    if (debounceTimer != null) clearTimeout(debounceTimer)
    const desired = search
    debounceTimer = setTimeout(() => {
      if (filter.search !== (desired !== '' ? desired : undefined)) {
        filter = { ...filter, search: desired !== '' ? desired : undefined }
        offset = 0
        void refresh()
      }
    }, 300)
  }

  const authItems: DropdownIntlItem[] = [
    { id: 'all', label: getEmbeddedLabel('All auth methods') },
    { id: 'email_only', label: getEmbeddedLabel('Email only') },
    { id: 'oidc', label: getEmbeddedLabel('OIDC only') },
    { id: 'mixed', label: getEmbeddedLabel('Email + OIDC') }
  ]

  const statusItems: DropdownIntlItem[] = [
    { id: 'all', label: getEmbeddedLabel('All statuses') },
    { id: 'active', label: getEmbeddedLabel('Active') },
    { id: 'disabled', label: getEmbeddedLabel('Disabled') }
  ]

  async function refresh (): Promise<void> {
    loading = true
    errorMessage = null
    try {
      const params: ListAccountsAdminParams = {
        search: filter.search,
        authMethod: filter.authMethod,
        status: filter.status,
        workspaceUuids: filter.workspaceUuids as any,
        sort,
        pagination: { limit, offset }
      }
      const res = await getAccountClient().listAccountsAdmin(params)
      accounts = res.accounts
      total = res.total
    } catch (err: any) {
      errorMessage = err?.message ?? 'Failed to load users'
    } finally {
      loading = false
    }
  }

  onMount(refresh)

  function onAuthChange (e: CustomEvent<string>): void {
    filter = { ...filter, authMethod: e.detail as any }
    offset = 0
    void refresh()
  }

  function onStatusChange (e: CustomEvent<string>): void {
    filter = { ...filter, status: e.detail as any }
    offset = 0
    void refresh()
  }

  function onSortChange (e: CustomEvent<typeof sort>): void {
    sort = e.detail
    void refresh()
  }

  function onPageChange (e: CustomEvent<{ offset: number }>): void {
    offset = e.detail.offset
    void refresh()
  }

  function onRowClick (e: CustomEvent<{ uuid: string }>): void {
    selectedUuid = e.detail.uuid
  }

  function onDrawerClose (): void {
    selectedUuid = null
  }

  function onAccountChanged (): void {
    void refresh()
  }
</script>

<AdminShell section="users">
  <div class="hulyComponent">
    <Header adaptive={'disabled'}>
      <Breadcrumb icon={setting.icon.Members} label={login.string.AdminUsers} size={'large'} isCurrent />
      <svelte:fragment slot="search">
        <SearchInput bind:value={search} collapsed />
      </svelte:fragment>
    </Header>

    <div class="hulyComponent-content__column content">
      <Scroller align={'center'} padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
        <div class="hulyComponent-content">
          <div class="stats">
            <div class="stat-item">
              <span class="stat-label">Total</span>
              <span class="stat-value">{total}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Active</span>
              <span class="stat-value stat-active">{counts.active}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Disabled</span>
              <span class="stat-value stat-disabled">{counts.disabled}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Admins</span>
              <span class="stat-value">{counts.admins}</span>
            </div>
          </div>

          <div class="filters flex-row-center flex-gap-2 p-2">
            <DropdownLabelsIntl
              items={authItems}
              selected={filter.authMethod ?? 'all'}
              kind={'regular'}
              size={'medium'}
              on:selected={onAuthChange}
            />
            <DropdownLabelsIntl
              items={statusItems}
              selected={filter.status ?? 'active'}
              kind={'regular'}
              size={'medium'}
              on:selected={onStatusChange}
            />
          </div>

          {#if errorMessage}
            <div class="error-banner">
              <Label label={getEmbeddedLabel(errorMessage)} />
            </div>
          {/if}

          <AdminUsersTable {accounts} {sort} {loading} on:sort={onSortChange} on:row-click={onRowClick} />

          <AdminUsersPagination {total} {offset} {limit} on:page={onPageChange} />
        </div>
      </Scroller>
    </div>
  </div>
</AdminShell>

{#if selectedUuid != null}
  <AdminUsersDrawer accountUuid={selectedUuid} on:close={onDrawerClose} on:account-changed={onAccountChanged} />
{/if}

<style lang="scss">
  .stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-3);
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: var(--spacing-2);
    background: var(--theme-bg-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--small-BorderRadius);
  }

  .stat-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--theme-darker-color);
  }

  .stat-value {
    font-size: 1.4rem;
    font-weight: 500;
    color: var(--theme-caption-color);
  }

  .stat-active {
    color: #059669;
  }

  .stat-disabled {
    color: #dc2626;
  }

  .filters {
    margin-bottom: var(--spacing-2);
  }

  .error-banner {
    padding: var(--spacing-2);
    margin-bottom: var(--spacing-2);
    background: var(--theme-state-negative-background-color, rgba(239, 68, 68, 0.08));
    border: 1px solid var(--theme-state-negative-border-color, rgba(239, 68, 68, 0.3));
    border-radius: var(--small-BorderRadius);
    color: var(--theme-state-negative-color, #b91c1c);
    font-size: 0.85rem;
  }
</style>
