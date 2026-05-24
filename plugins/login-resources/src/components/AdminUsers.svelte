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
    Button,
    Header,
    Scroller,
    SearchInput,
    DropdownLabelsIntl,
    Label,
    showPopup,
    type DropdownIntlItem
  } from '@hcengineering/ui'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { MessageBox, isAdminUser } from '@hcengineering/presentation'
  import AdminShell from './admin-shell/AdminShell.svelte'
  import FilterPresetMenu from './admin-shell/FilterPresetMenu.svelte'
  import AdminUsersTable from './admin-users/AdminUsersTable.svelte'
  import AdminUsersPagination from './admin-users/AdminUsersPagination.svelte'
  import AdminUsersDrawer from './admin-users/AdminUsersDrawer.svelte'
  import ColumnFilterPopup from './admin-users/ColumnFilterPopup.svelte'
  import BulkActionBar from './admin-users/BulkActionBar.svelte'
  import BulkPickWorkspacePopup from './admin-users/BulkPickWorkspacePopup.svelte'
  import CreateAccountPopup from './admin-users/CreateAccountPopup.svelte'
  import MassActionConfirm from './admin-users/MassActionConfirm.svelte'
  import { confirmAction } from './admin-users/util'
  import type {
    AccountListRow,
    BulkResult,
    ListAccountsAdminParams
  } from '@hcengineering/account-client'
  import { AccountRole, type AccountUuid } from '@hcengineering/core'

  interface AdminFilter {
    search?: string
    authMethod?: 'all' | 'email_only' | 'oidc' | 'mixed'
    status?: 'all' | 'active' | 'disabled'
    workspaceUuids?: string[]
  }

  let filter: AdminFilter = { status: 'all' }
  let sort: ListAccountsAdminParams['sort'] = { field: 'name', direction: 'asc' }
  let offset = 0
  const limit = 50

  // Per-column filter partials. Each entry holds a small object that
  // contributes one or more keys to the listAccountsAdmin filter
  // payload (e.g. { nameContains: 'foo' }, { statusIn: ['active'] }).
  let columnFilters: Record<string, any> = {}

  function mergeColumnFilters (cf: Record<string, any>): Record<string, any> {
    return Object.values(cf).reduce<Record<string, any>>((acc, partial) => ({ ...acc, ...partial }), {})
  }

  let accounts: AccountListRow[] = []
  let total = 0
  let loading = false
  let selectedUuid: string | null = null
  let errorMessage: string | null = null

  // Bulk-selection state. Kept as a Set<string> (account uuid).
  // Distinct from `selectedUuid` (drawer target) so the drawer can stay
  // open while selection changes, and so a row check does NOT pop the
  // drawer (the row checkbox cell stops click-propagation).
  let selectedUuids: Set<string> = new Set()

  function clearSel (): void {
    selectedUuids = new Set()
  }

  function onToggleSelection (e: CustomEvent<{ uuid: string, selected: boolean }>): void {
    const { uuid, selected } = e.detail
    const next = new Set(selectedUuids)
    if (selected) {
      next.add(uuid)
    } else {
      next.delete(uuid)
    }
    selectedUuids = next
  }

  function onToggleAll (e: CustomEvent<{ selected: boolean }>): void {
    const { selected } = e.detail
    const next = new Set(selectedUuids)
    const visible = accounts.map((a) => a.uuid as string)
    if (selected) {
      for (const u of visible) next.add(u)
    } else {
      for (const u of visible) next.delete(u)
    }
    selectedUuids = next
  }

  let search = ''
  let debounceTimer: ReturnType<typeof setTimeout> | undefined

  $: counts = {
    active: accounts.filter((a) => a.status === 'active').length,
    disabled: accounts.filter((a) => a.status === 'disabled').length,
    admins: accounts.filter((a) => a.isAdmin).length
  }

  $: activeFilterKeys = Object.keys(columnFilters).filter((k) => columnFilters[k] != null)
  $: filterSummary = activeFilterKeys.length === 0
    ? 'No filter set — operating on all accounts'
    : `Filter: ${activeFilterKeys.join(', ')}`

  // dangerousScope = true when admin is acting on the entire universe.
  // Important caveat: `total` here is the BACKEND-FILTERED count, not the
  // unfiltered universe. With backend pagination + filters, an admin who
  // filters down to 5 users + selects all 5 would otherwise trigger the
  // typed-confirm (5 == 5 == total) — that's not the footgun we want to
  // catch. So we require BOTH conditions: no filter is active AND
  // selected count covers the filtered total. With no filter, total IS
  // the universe. With a filter, the typed-confirm is suppressed because
  // the admin has explicitly narrowed scope.
  $: usersDangerousScope =
    activeFilterKeys.length === 0 && selectedUuids.size === total && total > 0

  // Ordered uuid list passed to the drawer so the drawer's Prev/Next pager
  // knows the page's row order. Cast in a reactive (not inline in markup)
  // because Svelte 4's attribute-brace parser rejects `as` casts inline.
  $: visibleAccountUuids = accounts.map((a) => a.uuid as string)

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
      const merged = mergeColumnFilters(columnFilters)
      const params: ListAccountsAdminParams = {
        search: filter.search,
        authMethod: filter.authMethod,
        status: filter.status,
        workspaceUuidsIn: filter.workspaceUuids as any,
        sort,
        pagination: { limit, offset },
        ...merged
      }
      const res = await getAccountClient().listAccountsAdmin(params)
      accounts = res.accounts
      total = res.total
      // Preserve only still-visible selections (avoids stale uuids in the
      // bulk-action bar after filter/sort/refetch).
      if (selectedUuids.size > 0) {
        const visible = new Set(accounts.map((a) => a.uuid as string))
        const next = new Set<string>()
        for (const u of selectedUuids) {
          if (visible.has(u)) next.add(u)
        }
        if (next.size !== selectedUuids.size) {
          selectedUuids = next
        }
      }
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

  function onDrawerNavigate (e: CustomEvent<{ uuid: string }>): void {
    selectedUuid = e.detail.uuid
  }

  function onAccountChanged (): void {
    void refresh()
  }

  // -------------------------------------------------------------------------
  // Bulk-action helpers
  // -------------------------------------------------------------------------

  // Both success and failure use MessageBox (info-only, canSubmit:false).
  // We deliberately avoid `addNotification(title, subTitle, component, ...)`
  // from ui/utils.ts:101 — its signature requires a notification-component
  // prop which is overkill for plain-text outcomes here.
  function showBulkResult (r: BulkResult): void {
    if (r.failed.length === 0) {
      showPopup(MessageBox, {
        label: getEmbeddedLabel('Bulk action complete'),
        message: getEmbeddedLabel(`${r.succeeded.length} account(s) updated.`),
        okLabel: getEmbeddedLabel('Dismiss'),
        canSubmit: false
      })
      return
    }
    const detail = r.failed.map((f) => `• ${f.accountUuid}: ${f.error}`).join('\n')
    showPopup(MessageBox, {
      label: getEmbeddedLabel('Bulk action — some failures'),
      message: getEmbeddedLabel(
        `${r.succeeded.length} succeeded, ${r.failed.length} failed:\n\n${detail}`
      ),
      okLabel: getEmbeddedLabel('Dismiss'),
      canSubmit: false
    })
  }

  function selectedUuidsArray (): AccountUuid[] {
    return [...selectedUuids] as AccountUuid[]
  }

  function onBulkAdd (): void {
    if (selectedUuids.size === 0) return
    showPopup(
      BulkPickWorkspacePopup,
      { mode: 'add' },
      'middle',
      (picked: { workspaceUuid: string, role?: AccountRole } | undefined) => {
        if (picked == null) return
        void (async () => {
          try {
            const r = await getAccountClient().bulkAddToWorkspace(
              selectedUuidsArray(),
              picked.workspaceUuid as any,
              picked.role ?? AccountRole.User
            )
            showBulkResult(r)
            // Preserve the selection only when EVERY action failed — admin can retry
            // without re-selecting. Otherwise clear so the bar doesn't stick around
            // pointing at uuids that were just successfully acted on.
            if (r.succeeded.length > 0) clearSel()
            await refresh()
          } catch (err: any) {
            errorMessage = err?.message ?? 'Bulk add failed'
          }
        })()
      }
    )
  }

  function onBulkRemove (): void {
    if (selectedUuids.size === 0) return
    showPopup(
      BulkPickWorkspacePopup,
      { mode: 'remove' },
      'middle',
      (picked: { workspaceUuid: string } | undefined) => {
        if (picked == null) return
        void (async () => {
          try {
            const r = await getAccountClient().bulkRemoveFromWorkspace(
              selectedUuidsArray(),
              picked.workspaceUuid as any
            )
            showBulkResult(r)
            // Preserve the selection only when EVERY action failed — admin can retry
            // without re-selecting. Otherwise clear so the bar doesn't stick around
            // pointing at uuids that were just successfully acted on.
            if (r.succeeded.length > 0) clearSel()
            await refresh()
          } catch (err: any) {
            errorMessage = err?.message ?? 'Bulk remove failed'
          }
        })()
      }
    )
  }

  function onBulkDisable (): void {
    if (selectedUuids.size === 0) return
    showPopup(
      MassActionConfirm,
      {
        title: `Disable ${selectedUuids.size} accounts`,
        affectedCount: selectedUuids.size,
        filterSummary,
        dangerousScope: usersDangerousScope,
        typedConfirmPhrase: 'DISABLE ALL',
        actionLabel: 'Disable',
        dangerous: true,
        helperText: 'Disabled users are immediately signed out of every workspace via accountLifecycleProducer.'
      },
      'middle',
      (confirmed) => {
        if (confirmed !== true) return
        void (async () => {
          const r = await getAccountClient().bulkSetDisabled(selectedUuidsArray(), true)
          showBulkResult(r)
          if (r.succeeded.length > 0) clearSel()
          await refresh()
        })()
      }
    )
  }

  function onBulkEnable (): void {
    if (selectedUuids.size === 0) return
    showPopup(
      MassActionConfirm,
      {
        title: `Re-enable ${selectedUuids.size} accounts`,
        affectedCount: selectedUuids.size,
        filterSummary,
        dangerousScope: usersDangerousScope,
        typedConfirmPhrase: 'ENABLE ALL',
        actionLabel: 'Enable',
        dangerous: false
      },
      'middle',
      (confirmed) => {
        if (confirmed !== true) return
        void (async () => {
          const r = await getAccountClient().bulkSetDisabled(selectedUuidsArray(), false)
          showBulkResult(r)
          if (r.succeeded.length > 0) clearSel()
          await refresh()
        })()
      }
    )
  }

  function onBulkReset (): void {
    if (selectedUuids.size === 0) return
    showPopup(
      MassActionConfirm,
      {
        title: `Send password-reset emails to ${selectedUuids.size} accounts`,
        affectedCount: selectedUuids.size,
        filterSummary,
        dangerousScope: usersDangerousScope,
        typedConfirmPhrase: 'RESET ALL',
        actionLabel: 'Send password-reset emails',
        dangerous: false
      },
      'middle',
      (confirmed) => {
        if (confirmed !== true) return
        void (async () => {
          const r = await getAccountClient().bulkSendPasswordReset(selectedUuidsArray())
          showBulkResult(r)
          if (r.succeeded.length > 0) clearSel()
          await refresh()
        })()
      }
    )
  }

  function onOpenColumnFilter (e: CustomEvent<{ column: string, anchor: HTMLElement }>): void {
    const { column, anchor } = e.detail
    showPopup(
      ColumnFilterPopup,
      { column, current: columnFilters[column] },
      anchor,
      (result: { column: string, payload: any | 'clear' } | undefined) => {
        if (result == null) return
        if (result.payload === 'clear') {
          const { [result.column]: _drop, ...rest } = columnFilters
          columnFilters = rest
        } else {
          columnFilters = { ...columnFilters, [result.column]: result.payload }
        }
        offset = 0
        void refresh()
      }
    )
  }

  // -------------------------------------------------------------------------
  // Create-account flow
  // -------------------------------------------------------------------------
  // Opens CreateAccountPopup and, on success, conditionally warns about
  // partial failures (inviteEmailSent === false / initialWorkspaceAssigned
  // === false) before opening the new account's drawer. Cancel returns
  // undefined and is ignored.
  function openCreateAccount (): void {
    showPopup(CreateAccountPopup, {}, 'middle', (r: any) => {
      if (r == null) return
      const warnings: string[] = []
      if (r.inviteEmailSent === false) {
        warnings.push('Invite email could not be sent — use "Send password reset" from the drawer.')
      }
      if (r.initialWorkspaceAssigned === false) {
        warnings.push('Initial workspace assignment failed — set it manually from the drawer.')
      }
      if (warnings.length > 0) {
        showPopup(MessageBox, {
          label: getEmbeddedLabel('Account created with warnings'),
          message: getEmbeddedLabel(warnings.join('\n\n')),
          okLabel: getEmbeddedLabel('Dismiss'),
          canSubmit: false
        })
      }
      selectedUuid = r.account.uuid
      void refresh()
    })
  }
</script>

<AdminShell section="users">
  <div class="hulyComponent">
    <Header adaptive={'disabled'}>
      <Breadcrumb icon={setting.icon.Members} label={login.string.AdminUsers} size={'large'} isCurrent />
    </Header>

    <div class="hulyComponent-content__column content">
      <Scroller padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
        <div class="hulyComponent-content">
          <div class="stats-row">
            <div class="stats-pills">
              <span class="stat-pill">Total <strong>{total}</strong></span>
              <span class="stat-pill"><span class="dot dot-active" /> Active <strong>{counts.active}</strong></span>
              <span class="stat-pill"><span class="dot dot-disabled" /> Disabled <strong>{counts.disabled}</strong></span>
              <span class="stat-pill">Admins <strong>{counts.admins}</strong></span>
              {@const orphanCount = accounts.filter((a) => a.status === 'active' && a.workspaceCount === 0).length}
              {#if orphanCount > 0}
                <span class="stat-pill stat-pill-warning">Orphan <strong>{orphanCount}</strong></span>
              {/if}
            </div>
            {#if isAdminUser()}
              <Button label={getEmbeddedLabel('Orphan accounts')} kind={'regular'} size={'medium'} on:click={() => {
                columnFilters = { orphan: { orphan: true } }
                offset = 0
                void refresh()
              }} />
              <Button label={getEmbeddedLabel('Add user')} kind={'primary'} on:click={openCreateAccount} />
            {/if}
          </div>

          <div class="filters">
            <div class="filters-search">
              <SearchInput bind:value={search} width={'100%'} placeholder={getEmbeddedLabel('Search by name or email…')} />
            </div>
            <DropdownLabelsIntl
              items={authItems}
              selected={filter.authMethod ?? 'all'}
              kind={'regular'}
              size={'medium'}
              on:selected={onAuthChange}
            />
            <DropdownLabelsIntl
              items={statusItems}
              selected={filter.status ?? 'all'}
              kind={'regular'}
              size={'medium'}
              on:selected={onStatusChange}
            />
            <FilterPresetMenu
              storageKey={'users'}
              currentState={{ filters: columnFilters, sort, search: filter.search }}
              on:apply={(e) => {
                const p = e.detail
                columnFilters = p.filters ?? {}
                if (p.sort != null) sort = p.sort
                if (p.search != null) filter = { ...filter, search: p.search }
                offset = 0
                void refresh()
              }}
            />
          </div>

          {#if errorMessage}
            <div class="error-banner">
              <Label label={getEmbeddedLabel(errorMessage)} />
            </div>
          {/if}

          <AdminUsersTable
            {accounts}
            {sort}
            {loading}
            {columnFilters}
            {selectedUuids}
            activeUuid={selectedUuid}
            on:sort={onSortChange}
            on:row-click={onRowClick}
            on:open-filter={onOpenColumnFilter}
            on:toggle-selection={onToggleSelection}
            on:toggle-all={onToggleAll}
          />

          {#if total > limit}
            <AdminUsersPagination {total} {offset} {limit} on:page={onPageChange} />
          {/if}

          <BulkActionBar
            count={selectedUuids.size}
            on:deselect-all={clearSel}
            on:add={onBulkAdd}
            on:remove={onBulkRemove}
            on:disable={onBulkDisable}
            on:enable={onBulkEnable}
            on:reset={onBulkReset}
          />
        </div>
      </Scroller>
    </div>
  </div>
</AdminShell>

{#if selectedUuid != null}
  <AdminUsersDrawer
    accountUuid={selectedUuid}
    visibleUuids={visibleAccountUuids}
    on:close={onDrawerClose}
    on:account-changed={onAccountChanged}
    on:navigate={onDrawerNavigate}
  />
{/if}

<style lang="scss">
  .hulyComponent-content {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    /* Use the full available content width. Each child (stats-row,
       filters, table) gets its own padding via the parent Scroller and
       its own internal sub-layout. */
    width: 100%;
    gap: var(--spacing-2);
  }

  .stats-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-2);
    width: 100%;
    max-width: none;
  }

  .stats-pills {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 1rem;
    font-size: 0.8rem;
    color: var(--theme-darker-color);
  }

  .stat-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    line-height: 1.2;

    strong {
      color: var(--theme-caption-color);
      font-weight: 600;
    }
  }

  .stat-pill-warning {
    color: #b45309;
    background: rgba(245, 158, 11, 0.10);
    border-radius: 999px;
    padding: 0.1rem 0.6rem;
  }

  .dot {
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 50%;
    display: inline-block;
  }

  .dot-active {
    background: #10b981;
  }

  .dot-disabled {
    background: #ef4444;
  }

  .filters {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-2);
    width: 100%;
    max-width: none;
  }

  .filters-search {
    flex: 1;
    max-width: 480px;
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
