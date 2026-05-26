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
    Icon,
    Scroller,
    SearchInput,
    DropdownLabelsIntl,
    Label,
    showPopup,
    getCurrentLocation,
    type DropdownIntlItem
  } from '@hcengineering/ui'
  import { getEmbeddedLabel, getMetadata } from '@hcengineering/platform'
  import presentation, { MessageBox, isAdminUser } from '@hcengineering/presentation'
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
  import { mergeColumnFilters } from './admin-shared/columnFilters'
  import { DEBOUNCE_MS } from './admin-shared/constants'
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

  // Toggle the "active accounts with no workspaces" filter (Issue 14).
  // Driven by the clickable orphan stat-pill — clicking once activates
  // columnFilters.orphan, clicking again clears it. Replaces the old
  // "Orphan accounts" button which had no off-switch.
  function toggleOrphanFilter (): void {
    if (columnFilters?.orphan?.orphan === true) {
      const { orphan: _drop, ...rest } = columnFilters
      columnFilters = rest
    } else {
      columnFilters = { ...columnFilters, orphan: { orphan: true } }
    }
    offset = 0
    void refresh()
  }

  // Issue 19: stat-pill helpers. Active/Disabled pills mutate the
  // status dropdown filter; Admins pill flows through columnFilters so
  // it merges into the listAccountsAdmin params alongside orphan. Total
  // pill clears every filter (status + admin + orphan).
  function hasAnyFilter (): boolean {
    return (filter.status ?? 'all') !== 'all' ||
      columnFilters?.isAdmin?.isAdmin === true ||
      columnFilters?.orphan?.orphan === true
  }

  function clearAllFilters (): void {
    filter = { ...filter, status: 'all' }
    const { isAdmin: _a, orphan: _o, ...rest } = columnFilters
    columnFilters = rest
    offset = 0
    void refresh()
  }

  function toggleStatusFilter (target: 'active' | 'disabled'): void {
    filter = { ...filter, status: filter.status === target ? 'all' : target }
    offset = 0
    void refresh()
  }

  function toggleAdminFilter (): void {
    if (columnFilters?.isAdmin?.isAdmin === true) {
      const { isAdmin: _drop, ...rest } = columnFilters
      columnFilters = rest
    } else {
      columnFilters = { ...columnFilters, isAdmin: { isAdmin: true } }
    }
    offset = 0
    void refresh()
  }
  let debounceTimer: ReturnType<typeof setTimeout> | undefined

  // Trigger CSV download with the same filter+sort the user currently sees.
  // Fetch + blob download so the admin Bearer token travels in the
  // Authorization header instead of the URL (no token in history, server
  // access logs, or Referer headers on any redirect/subresource).
  async function exportAccountsCsv (): Promise<void> {
    const tok = getMetadata(presentation.metadata.Token) ?? ''
    if (tok === '') return
    const accountsUrl = getMetadata(login.metadata.AccountsUrl) ?? ''
    const merged = mergeColumnFilters(columnFilters)
    // Mirror the refresh()-side mapping: server SQL only reads the *In
    // arrays, so the toolbar dropdowns must be translated before export.
    const statusIn: Array<'active' | 'disabled'> | undefined =
      filter.status === 'active'
        ? ['active']
        : filter.status === 'disabled'
          ? ['disabled']
          : undefined
    const authMethodIn: Array<'email_only' | 'oidc' | 'mixed'> | undefined =
      filter.authMethod != null && filter.authMethod !== 'all'
        ? [filter.authMethod]
        : undefined
    const params: Record<string, any> = {
      search: filter.search,
      statusIn,
      authMethodIn,
      workspaceUuidsIn: filter.workspaceUuids,
      sort,
      ...merged
    }
    const filterB64 = btoa(unescape(encodeURIComponent(JSON.stringify(params))))
    const url = `${accountsUrl.replace(/\/$/, '')}/api/v1/admin/export/accounts.csv?filter=${encodeURIComponent(filterB64)}`

    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${tok}` } })
      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        console.error('CSV export failed', res.status, errText)
        return
      }
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `huly-users-${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('CSV export error', err)
    }
  }

  $: counts = {
    active: accounts.filter((a) => a.status === 'active').length,
    disabled: accounts.filter((a) => a.status === 'disabled').length,
    admins: accounts.filter((a) => a.isAdmin).length
  }
  $: orphanCount = accounts.filter((a) => a.status === 'active' && a.workspaceCount === 0).length

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
    }, DEBOUNCE_MS)
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
      // The legacy single-string `status` / `authMethod` request fields are
      // not consumed by the server's SQL builder (which only reads the
      // *In array variants). Map them here so the toolbar dropdowns
      // actually narrow the result set; drop the vestigial fields entirely.
      const statusIn: Array<'active' | 'disabled'> | undefined =
        filter.status === 'active'
          ? ['active']
          : filter.status === 'disabled'
            ? ['disabled']
            : undefined
      const authMethodIn: Array<'email_only' | 'oidc' | 'mixed'> | undefined =
        filter.authMethod != null && filter.authMethod !== 'all'
          ? [filter.authMethod]
          : undefined
      const params: ListAccountsAdminParams = {
        search: filter.search,
        statusIn,
        authMethodIn,
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

  onMount(() => {
    void refresh()
    // Open drawer pre-set by ?drawer=<uuid> (e.g. from GlobalSearch)
    const loc = getCurrentLocation()
    const wantUuid = loc.query?.drawer
    if (wantUuid != null && wantUuid !== '') {
      selectedUuid = wantUuid
    }
  })

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
              <span class="stat-leading-icon"><Icon icon={setting.icon.Members} size={'small'} /></span>
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <span
                class="stat-pill stat-pill-clickable stat-pill-total"
                class:is-filter-active={!hasAnyFilter()}
                role="button"
                tabindex="0"
                title="Show all users (clear filters)"
                on:click={clearAllFilters}
                on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clearAllFilters() } }}
              >
                Total <strong>{total}</strong>
              </span>
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <span
                class="stat-pill stat-pill-clickable stat-pill-active"
                class:is-filter-active={filter.status === 'active'}
                role="button"
                tabindex="0"
                title={filter.status === 'active' ? 'Click to clear status filter' : 'Click to filter: only active accounts'}
                on:click={() => toggleStatusFilter('active')}
                on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleStatusFilter('active') } }}
              >
                <span class="dot dot-active" /> Active <strong>{counts.active}</strong>
              </span>
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <span
                class="stat-pill stat-pill-clickable stat-pill-disabled"
                class:is-filter-active={filter.status === 'disabled'}
                role="button"
                tabindex="0"
                title={filter.status === 'disabled' ? 'Click to clear status filter' : 'Click to filter: only disabled accounts'}
                on:click={() => toggleStatusFilter('disabled')}
                on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleStatusFilter('disabled') } }}
              >
                <span class="dot dot-disabled" /> Disabled <strong>{counts.disabled}</strong>
              </span>
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <span
                class="stat-pill stat-pill-clickable stat-pill-admin"
                class:is-filter-active={columnFilters?.isAdmin?.isAdmin === true}
                role="button"
                tabindex="0"
                title={columnFilters?.isAdmin?.isAdmin === true ? 'Click to clear admin filter' : 'Click to filter: only admin accounts'}
                on:click={toggleAdminFilter}
                on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleAdminFilter() } }}
              >
                Admins <strong>{counts.admins}</strong>
              </span>
              {#if orphanCount > 0}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <span
                  class="stat-pill stat-pill-warning stat-pill-clickable"
                  class:is-filter-active={columnFilters?.orphan?.orphan === true}
                  role="button"
                  tabindex="0"
                  title={columnFilters?.orphan?.orphan === true
                    ? 'Click to clear the orphan filter'
                    : 'Click to filter: active accounts with no workspaces'}
                  on:click={toggleOrphanFilter}
                  on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleOrphanFilter() } }}
                >
                  {#if columnFilters?.orphan?.orphan === true}
                    <span class="filter-icon" aria-hidden="true">⏵</span>
                  {/if}
                  Orphan <strong>{orphanCount}</strong>
                </span>
              {/if}
            </div>
            {#if isAdminUser()}
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
            {#if isAdminUser()}
              <Button label={getEmbeddedLabel('Export CSV')} kind={'regular'} size={'medium'} on:click={exportAccountsCsv} />
            {/if}
          </div>

          {#if errorMessage}
            <div class="error-banner">
              <Label label={getEmbeddedLabel(errorMessage)} />
            </div>
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

  .stat-leading-icon {
    display: inline-flex;
    align-items: center;
    margin-right: 0.35rem;
    opacity: 0.7;
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

  /* Issue 19: shared affordance for any clickable stat-pill (Total,
     Active, Disabled, Admins, Orphan). Pointer cursor, neutral hover
     lift via theme accent, visible focus ring. Active state colors
     are applied by the semantic variants below. */
  .stat-pill-clickable {
    cursor: pointer;
    user-select: none;
    border: 1px solid transparent;
    border-radius: 999px;
    padding: 0.1rem 0.6rem;
    transition: background 80ms ease, border-color 80ms ease, color 80ms ease;

    &:hover {
      background: var(--theme-bg-accent-color, rgba(148, 163, 184, 0.18));
    }

    &:focus-visible {
      outline: 2px solid var(--theme-button-focused-border, #2563eb);
      outline-offset: 2px;
    }
  }

  /* Total pill: neutral tint when no other filter is active. Acts as
     a "show all" state indicator. */
  .stat-pill-total.is-filter-active {
    background: var(--theme-bg-accent-color, rgba(148, 163, 184, 0.22));
    border-color: var(--theme-divider-color, rgba(148, 163, 184, 0.45));
  }

  .stat-pill-active.is-filter-active {
    background: rgba(16, 185, 129, 0.18);
    border-color: rgba(16, 185, 129, 0.45);
    color: var(--theme-state-positive-color, #047857);

    strong {
      color: var(--theme-state-positive-color, #047857);
    }
  }

  .stat-pill-disabled.is-filter-active {
    background: rgba(239, 68, 68, 0.18);
    border-color: rgba(239, 68, 68, 0.45);
    color: var(--theme-state-negative-color, #b91c1c);

    strong {
      color: var(--theme-state-negative-color, #b91c1c);
    }
  }

  .stat-pill-admin.is-filter-active {
    background: rgba(96, 165, 250, 0.18);
    border-color: rgba(96, 165, 250, 0.45);
    color: var(--primary-button-color, #2563eb);

    strong {
      color: var(--primary-button-color, #2563eb);
    }
  }

  /* Issue 14: Orphan pill amber active state (kept identical to v4). */
  .stat-pill-warning.is-filter-active {
    background: rgba(245, 158, 11, 0.28);
    border-color: rgba(245, 158, 11, 0.55);
    color: #92400e;

    strong {
      color: #92400e;
    }
  }

  .filter-icon {
    display: inline-flex;
    align-items: center;
    margin-right: 0.25rem;
    font-size: 0.65rem;
    line-height: 1;
    color: #92400e;
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
