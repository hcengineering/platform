<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { onMount } from 'svelte'
  import { Breadcrumb, Button, DropdownLabelsIntl, Header, Icon, IconFilter, Scroller } from '@hcengineering/ui'
  import { getEmbeddedLabel, type IntlString } from '@hcengineering/platform'
  import type { DropdownIntlItem } from '@hcengineering/ui'
  import { getAccountClient } from '../utils'
  import type { AuditEntry, ListAuditAdminParams } from '@hcengineering/account-client'
  import AdminShell from './admin-shell/AdminShell.svelte'
  import AuditEmptyState from './admin-shell/AuditEmptyState.svelte'
  import setting from '@hcengineering/setting'

  let entries: AuditEntry[] = []
  let nextCursor: string | null = null
  let loading = false

  // V30 — Audit-log filter redesign.
  // The old UI showed 4 UUID inputs which the admin doesn't recognise
  // (the table itself displays names, not UUIDs). Replaced with
  // substring filters bound to the same identifiers the table renders:
  // admin name/email and target user/workspace name. Action is a multi-
  // select of the known audit-write call sites in serviceOperations.ts
  // / operations.ts so the admin doesn't have to guess strings.
  let filterAdminName = ''
  let filterTargetName = ''
  let filterFrom = ''
  let filterTo = ''
  // V32 — Date-range preset dropdown. Default on first mount is "Last 3
  // days" so the table opens scoped instead of returning the full
  // history. When a preset is picked, filterFrom/filterTo are clamped
  // and the two <input type="date"> become disabled so the admin must
  // explicitly switch to "Custom range" to hand-edit dates.
  const datePresets: DropdownIntlItem[] = [
    { id: '1d', label: getEmbeddedLabel('Last 1 day') },
    { id: '2d', label: getEmbeddedLabel('Last 2 days') },
    { id: '3d', label: getEmbeddedLabel('Last 3 days') },
    { id: '1w', label: getEmbeddedLabel('Last 1 week') },
    { id: '2w', label: getEmbeddedLabel('Last 2 weeks') },
    { id: '1m', label: getEmbeddedLabel('Last 1 month') },
    { id: 'custom', label: getEmbeddedLabel('Custom range') }
  ]
  let dateRangePreset: string = '3d'
  const datePresetLabels: Record<string, string> = {
    '1d': 'Last 1 day',
    '2d': 'Last 2 days',
    '3d': 'Last 3 days',
    '1w': 'Last 1 week',
    '2w': 'Last 2 weeks',
    '1m': 'Last 1 month',
    custom: 'Custom range'
  }
  // Internal flag — when applyDateRangePreset mutates filterFrom/filterTo
  // we don't want the bind:value watchers to flip dateRangePreset back
  // to 'custom'. Setting/clearing this around the writes is enough.
  let presetApplying = false

  function applyDateRangePreset (id: string): void {
    if (id === 'custom') {
      dateRangePreset = 'custom'
      void reload(true)
      return
    }
    const days = id === '1d' ? 1 : id === '2d' ? 2 : id === '3d' ? 3
      : id === '1w' ? 7 : id === '2w' ? 14 : 30
    const now = new Date()
    const past = new Date(now.getTime() - days * 86_400_000)
    const fmt = (d: Date): string =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    presetApplying = true
    filterFrom = fmt(past)
    filterTo = fmt(now)
    presetApplying = false
    dateRangePreset = id
    void reload(true)
  }

  function onDatePresetSelected (e: CustomEvent<string | number>): void {
    applyDateRangePreset(String(e.detail))
  }

  // Manual edit to either date input bumps us into Custom mode so the
  // dropdown stays in sync with what's actually applied. The disabled
  // attribute on the inputs already blocks edits while a preset is
  // active, but defence-in-depth: a screen-reader path or programmatic
  // change would still mark us as custom.
  function onDateInputChanged (): void {
    if (presetApplying) return
    if (dateRangePreset !== 'custom') {
      dateRangePreset = 'custom'
    }
  }
  // The action vocabulary is the set of `action: '<string>'` literals
  // passed to db.adminAuditLog.insert() across the account service.
  // Keep this list in sync with serviceOperations.ts/operations.ts —
  // grep -nE "action: '" server/account/src for the source of truth.
  interface ActionOption { id: string, label: IntlString }
  const ACTION_OPTIONS: ActionOption[] = [
    { id: 'create_account', label: getEmbeddedLabel('create_account') },
    { id: 'disable', label: getEmbeddedLabel('disable') },
    { id: 'enable', label: getEmbeddedLabel('enable') },
    { id: 'trigger_password_reset', label: getEmbeddedLabel('trigger_password_reset') },
    { id: 'add_workspace_member', label: getEmbeddedLabel('add_workspace_member') },
    { id: 'remove_member', label: getEmbeddedLabel('remove_member') },
    { id: 'role_change', label: getEmbeddedLabel('role_change') }
  ]
  let selectedActionIds: string[] = []

  // V30 — Server-side sort. Default = time DESC (= legacy behaviour).
  type SortField = 'time' | 'admin' | 'action' | 'target'
  type SortDir = 'asc' | 'desc'
  let sort: { field: SortField, direction: SortDir } = { field: 'time', direction: 'desc' }

  async function reload (resetCursor = true): Promise<void> {
    loading = true
    try {
      const params: ListAuditAdminParams = {
        filter: {
          adminNameOrEmail: filterAdminName.trim() !== '' ? filterAdminName.trim() : undefined,
          targetNameOrUrl: filterTargetName.trim() !== '' ? filterTargetName.trim() : undefined,
          actionIn: selectedActionIds.length > 0 ? selectedActionIds : undefined,
          from: filterFrom !== '' ? new Date(filterFrom).getTime() : undefined,
          to: filterTo !== '' ? new Date(filterTo).getTime() : undefined
        },
        sort,
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
    // V32 — apply the default preset; this sets filterFrom/filterTo and
    // calls reload() exactly once, so no separate void reload() here.
    applyDateRangePreset('3d')
  })

  function setSort (field: SortField): void {
    let direction: SortDir = field === 'time' ? 'desc' : 'asc'
    if (sort.field === field) {
      direction = sort.direction === 'asc' ? 'desc' : 'asc'
    }
    sort = { field, direction }
    void reload(true)
  }

  function clearFilters (): void {
    filterAdminName = ''
    filterTargetName = ''
    selectedActionIds = []
    sort = { field: 'time', direction: 'desc' }
    // V32 — Reset goes back to the default preset (Last 3 days), not to
    // an empty date range. applyDateRangePreset triggers reload().
    applyDateRangePreset('3d')
  }

  function onActionSelected (e: CustomEvent<string | number | Array<string | number>>): void {
    const v = e.detail
    selectedActionIds = Array.isArray(v) ? v.map((x) => String(x)) : v != null ? [String(v)] : []
    void reload(true)
  }

  $: hasFilter = filterAdminName.trim() !== '' || filterTargetName.trim() !== '' ||
                 selectedActionIds.length > 0 ||
                 filterFrom !== '' || filterTo !== ''

  const PAGE_RENDER_CAP = 200  // hard ceiling on simultaneously-rendered rows
  // listAuditAdmin orders by the active sort (default ts_ms DESC,
  // verified in server/account/src/collections/postgres/postgres.ts).
  // entries[0] is the first row of the active sort — slice from the
  // head so the user sees the top of the result set, never the tail.
  $: visibleEntries = entries.length > PAGE_RENDER_CAP
    ? entries.slice(0, PAGE_RENDER_CAP)
    : entries

  // Plan 1d Task 3 — Walk visibleEntries once into groups keyed by batchId so
  // consecutive same-batchId rows render under one non-interactive header.
  // Rows with no batchId remain singleton groups so the existing single-action
  // UX is unchanged. listAuditAdmin orders by (sort.field, al.id) consistently,
  // so rows from one bulk call remain contiguous when the default time sort is
  // active. Under other sort orders bulk grouping naturally degrades — the
  // header still renders correctly for any contiguous run of the same batchId.
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

  // V31 — Per-column filter buttons in the table header. Each button
  // scrolls the matching control in the top filter bar into view and
  // focuses it, so the admin gets the Users-table parity she expects
  // without duplicating the top-bar inputs. No new popup component.
  let filterBarEl: HTMLElement | undefined
  function focusInput (col: 'admin' | 'target' | 'action' | 'time'): void {
    if (filterBarEl == null) return
    const selector = {
      admin: 'input.audit-filter-admin',
      target: 'input.audit-filter-target',
      // DropdownLabelsIntl renders as a Button; pick the button inside the
      // wrapper that owns the action multi-select.
      action: '.audit-filter-action-wrap button',
      time: 'input.audit-filter-from'
    }[col]
    const el = filterBarEl.querySelector<HTMLElement>(selector)
    if (el == null) return
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    setTimeout(() => {
      el.focus()
      if (el instanceof HTMLInputElement) el.select()
    }, 200)
  }

  // Svelte 4 reactivity caveat: a plain helper that reads `sort` via
  // closure is not re-evaluated by Svelte when sort changes, so the
  // header arrow stayed frozen on its first-render value (the reviewer
  // saw '↓' that never flipped to '↑'). Wrap in a reactive factory:
  // `$:` re-runs whenever `sort` changes and produces a fresh closure,
  // which forces every {arrowFor(...)} call site to re-render.
  $: arrowFor = (field: SortField): string => {
    if (sort.field !== field) return ''
    return sort.direction === 'asc' ? '↑' : '↓'
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

          <!-- V30 — Filter bar. Three logical groups: who/what, date
               range, and the apply/reset controls. Each control is
               labelled so the admin can see what column it filters. -->
          <div class="audit-filter-bar" bind:this={filterBarEl}>
            <div class="audit-filter-group">
              <label class="audit-filter-field" data-filter-col="admin">
                <span class="audit-filter-label">Admin (name or email)</span>
                <input class="audit-filter-text audit-filter-admin" type="text" bind:value={filterAdminName}
                       placeholder="e.g. Jane or jane@example.com"
                       on:keydown={(ev) => { if (ev.key === 'Enter') void reload(true) }} />
              </label>
              <label class="audit-filter-field" data-filter-col="target">
                <span class="audit-filter-label">Target (user or workspace)</span>
                <input class="audit-filter-text audit-filter-target" type="text" bind:value={filterTargetName}
                       placeholder="e.g. Acme or acme.huly"
                       on:keydown={(ev) => { if (ev.key === 'Enter') void reload(true) }} />
              </label>
              <div class="audit-filter-field audit-filter-action-wrap" data-filter-col="action">
                <span class="audit-filter-label">Actions</span>
                <DropdownLabelsIntl
                  kind="regular"
                  size="medium"
                  multiselect
                  items={ACTION_OPTIONS}
                  selected={selectedActionIds}
                  label={getEmbeddedLabel(selectedActionIds.length === 0
                    ? 'All actions'
                    : `${selectedActionIds.length} selected`)}
                  on:selected={onActionSelected}
                />
              </div>
            </div>

            <div class="audit-filter-group">
              <div class="audit-filter-field audit-filter-field--inline" data-filter-col="time">
                <span class="audit-filter-label">Date range</span>
                <div class="audit-filter-date-row">
                  <div class="audit-filter-preset">
                    <DropdownLabelsIntl
                      kind="regular"
                      size="medium"
                      items={datePresets}
                      selected={dateRangePreset}
                      label={getEmbeddedLabel(datePresetLabels[dateRangePreset] ?? 'Last 3 days')}
                      on:selected={onDatePresetSelected}
                    />
                  </div>
                  <input class="audit-filter-date audit-filter-from" type="date"
                         bind:value={filterFrom}
                         disabled={dateRangePreset !== 'custom'}
                         on:change={onDateInputChanged}
                         aria-label="From date" />
                  <span class="audit-filter-date-sep">→</span>
                  <input class="audit-filter-date audit-filter-to" type="date"
                         bind:value={filterTo}
                         disabled={dateRangePreset !== 'custom'}
                         on:change={onDateInputChanged}
                         aria-label="To date" />
                </div>
              </div>
            </div>

            <div class="audit-filter-actions">
              <Button kind="primary" label={getEmbeddedLabel('Apply')} on:click={() => { void reload(true) }} />
              {#if hasFilter || sort.field !== 'time' || sort.direction !== 'desc'}
                <Button kind="ghost" label={getEmbeddedLabel('Reset')} on:click={clearFilters} />
              {/if}
            </div>
          </div>

          {#if entries.length > PAGE_RENDER_CAP}
            <div class="audit-cap-notice" role="status">
              Showing the first {PAGE_RENDER_CAP} of {entries.length} loaded
              entries (current sort). Apply a filter to narrow the result set.
            </div>
          {/if}

          <table class="audit-table">
            <thead>
              <tr>
                <th scope="col" class="sortable" class:is-sorted={sort.field === 'time'}>
                  <div class="th-row">
                    <button type="button" class="sort-btn" on:click={() => setSort('time')}>
                      {#if sort.field === 'time'}<span class="sort-arrow">{arrowFor('time')}</span>{/if}Time
                    </button>
                    <button class="filter-btn"
                            class:active={filterFrom !== '' || filterTo !== ''}
                            title="Filter by date range"
                            on:click|stopPropagation={() => focusInput('time')}>
                      <Icon icon={IconFilter} size={'x-small'} />
                    </button>
                  </div>
                </th>
                <th scope="col" class="sortable" class:is-sorted={sort.field === 'admin'}>
                  <div class="th-row">
                    <button type="button" class="sort-btn" on:click={() => setSort('admin')}>
                      {#if sort.field === 'admin'}<span class="sort-arrow">{arrowFor('admin')}</span>{/if}Admin
                    </button>
                    <button class="filter-btn"
                            class:active={filterAdminName.trim() !== ''}
                            title="Filter by admin name or email"
                            on:click|stopPropagation={() => focusInput('admin')}>
                      <Icon icon={IconFilter} size={'x-small'} />
                    </button>
                  </div>
                </th>
                <th scope="col" class="sortable" class:is-sorted={sort.field === 'action'}>
                  <div class="th-row">
                    <button type="button" class="sort-btn" on:click={() => setSort('action')}>
                      {#if sort.field === 'action'}<span class="sort-arrow">{arrowFor('action')}</span>{/if}Action
                    </button>
                    <button class="filter-btn"
                            class:active={selectedActionIds.length > 0}
                            title="Filter by action"
                            on:click|stopPropagation={() => focusInput('action')}>
                      <Icon icon={IconFilter} size={'x-small'} />
                    </button>
                  </div>
                </th>
                <th scope="col" class="sortable" class:is-sorted={sort.field === 'target'}>
                  <div class="th-row">
                    <button type="button" class="sort-btn" on:click={() => setSort('target')}>
                      {#if sort.field === 'target'}<span class="sort-arrow">{arrowFor('target')}</span>{/if}Target
                    </button>
                    <button class="filter-btn"
                            class:active={filterTargetName.trim() !== ''}
                            title="Filter by target user or workspace"
                            on:click|stopPropagation={() => focusInput('target')}>
                      <Icon icon={IconFilter} size={'x-small'} />
                    </button>
                  </div>
                </th>
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
                    on:clearFilter={clearFilters} /></td></tr>
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
    gap: 0.75rem 1rem;
    align-items: flex-end;
    margin-bottom: var(--spacing-2);
    padding: 0.6rem 0.75rem;
    background: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--small-BorderRadius);
  }

  .audit-filter-group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 0.75rem;
    align-items: flex-end;
  }

  .audit-filter-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 14rem;
    flex: 1 1 14rem;
  }

  .audit-filter-field--inline {
    min-width: auto;
    flex: 0 0 auto;
  }

  .audit-filter-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--theme-darker-color);
    font-weight: 600;
  }

  .audit-filter-text,
  .audit-filter-date {
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
    flex: 0 0 10.5rem;
    min-width: 10.5rem;

    &:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      background: var(--theme-bg-accent-color);
    }
  }

  // V32 — Wraps the preset DropdownLabelsIntl so it sits flush with the
  // date inputs. The dropdown component supplies its own button styling
  // so we only need the inline-flex container.
  .audit-filter-preset {
    display: inline-flex;
    align-items: center;
    flex: 0 0 auto;
  }

  .audit-filter-date-row {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }

  .audit-filter-date-sep {
    color: var(--theme-darker-color);
    font-size: 0.85rem;
  }

  .audit-filter-actions {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    margin-left: auto;
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

    th.sortable {
      padding: 0;
    }

    th.is-sorted {
      background: var(--theme-bg-color);
      color: var(--theme-caption-color);
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

  // V31 — Header row container so the sort button and the per-column
  // filter button can sit side-by-side. Sort button claims slack so the
  // header text stays left-aligned with body cells; filter button is
  // narrow + right-flush.
  .th-row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    width: 100%;
  }

  .sort-btn {
    flex: 1;
    text-align: left;
    background: transparent;
    border: 0;
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    font: inherit;
    color: inherit;
    text-transform: inherit;
    letter-spacing: inherit;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;

    &:hover {
      color: var(--theme-caption-color);
    }
    &:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: -2px;
    }
  }

  .sort-arrow {
    display: inline-block;
    width: 0.75rem;
    color: var(--theme-caption-color);
    font-weight: 700;
  }

  // Per-column filter button — mirrors the AdminUsersTable .filter-btn
  // (transparent, quiet at 0.35 opacity until hover/active). Active
  // state matches the Users page (#2563eb on translucent blue).
  .filter-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 0;
    padding: 0.1rem 0.25rem;
    margin-right: 0.4rem;
    cursor: pointer;
    color: var(--theme-darker-color);
    border-radius: 0.25rem;
    opacity: 0.35;
    transition: opacity 80ms ease, color 80ms ease, background 80ms ease;

    &:hover {
      opacity: 1;
      color: var(--theme-caption-color);
      background: var(--theme-divider-color);
    }
    &:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: -2px;
      opacity: 1;
    }

    &.active {
      opacity: 1;
      color: #2563eb;
      background: rgba(96, 165, 250, 0.18);
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
