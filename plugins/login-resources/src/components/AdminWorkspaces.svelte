<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { csvEscape, RegionInfo } from '@hcengineering/account-client'
  import {
    groupByArray,
    isActiveMode,
    isArchivingMode,
    isDeletingMode,
    isMigrationMode,
    isRestoringMode,
    isUpgradingMode,
    reduceCalls,
    versionToString,
    type WorkspaceInfoWithStatus
  } from '@hcengineering/core'
  import { getEmbeddedLabel, getMetadata } from '@hcengineering/platform'
  import presentation, {
    copyTextToClipboard,
    isAdminUser,
    MessageBox,
    type OverviewStatistics
  } from '@hcengineering/presentation'
  import {
    Button,
    ButtonMenu,
    CheckBox,
    Icon,
    IconArrowRight,
    IconCopy,
    IconDownOutline,
    IconFilter,
    IconOpen,
    IconStart,
    IconStop,
    locationToUrl,
    Scroller,
    showPopup,
    ticker
  } from '@hcengineering/ui'
  import { workbenchId } from '@hcengineering/workbench'
  import { getAllWorkspaces, getRegionInfo, goTo, performWorkspaceOperation } from '../utils'
  import AdminShell from './admin-shell/AdminShell.svelte'
  import FilterPresetMenu from './admin-shell/FilterPresetMenu.svelte'
  import AdminWorkspaceDrawer from './admin-workspaces/AdminWorkspaceDrawer.svelte'
  import LongRunningWorkspaceBanner from './admin-workspaces/LongRunningWorkspaceBanner.svelte'
  import WorkspaceColumnFilterPopup from './admin-workspaces/WorkspaceColumnFilterPopup.svelte'
  import MassActionConfirm from './admin-users/MassActionConfirm.svelte'
  import { Breadcrumb, Header, IconSettings } from '@hcengineering/ui'
  import login from '@hcengineering/login'

  $: now = $ticker

  $: isAdmin = isAdminUser()

  async function select (workspace: string): Promise<void> {
    const url = locationToUrl({ path: [workbenchId, workspace] })
    window.open(url, '_blank')
  }

  type WorkspaceInfo = WorkspaceInfoWithStatus & { processingAttempts: number }

  let workspaces: WorkspaceInfo[] = []

  // Per-column sort. Click header → sort by that column; click again → reverse.
  type SortField = 'name' | 'region' | 'last_visit' | 'mode' | 'attempts' | 'progress' | 'backup_size' | 'backup_age'
  let sortField: SortField = 'name'
  let sortDir: 'asc' | 'desc' = 'asc'

  function setSort (field: SortField): void {
    if (sortField === field) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc'
    } else {
      sortField = field
      sortDir = 'asc'
    }
  }

  // Per-column filters. Each entry is a small payload object for one column.
  let columnFilters: Record<string, any> = {}

  const updateWorkspaces = reduceCalls(async (_: number) => {
    const res = await getAllWorkspaces()
    workspaces = res as WorkspaceInfo[]
  })

  $: void updateWorkspaces($ticker)

  function getBackupSize (workspace: WorkspaceInfo): number {
    return Math.max(
      workspace.backupInfo?.backupSize ?? 0,
      (workspace.backupInfo?.dataSize ?? 0) + (workspace.backupInfo?.blobsSize ?? 0)
    )
  }

  function getLastVisitDays (it: WorkspaceInfo): number {
    return Math.round((now - (it.lastVisit ?? 0)) / (1000 * 3600 * 24))
  }

  function getBackupAgeHours (it: WorkspaceInfo): number | null {
    if (it.backupInfo == null) return null
    return Math.round((now - it.backupInfo.lastBackup) / (1000 * 3600))
  }

  // Reactive predicate + comparator. Inline closures so Svelte tracks the
  // changes to columnFilters / sortField / sortDir (a plain function would
  // not re-run the reactive sortedWorkspaces statement when these change).
  $: matchesColumnFilters = (cf: Record<string, any>) => (it: WorkspaceInfo): boolean => {
    if (cf.name?.nameContains != null) {
      const needle = cf.name.nameContains.toLowerCase()
      const hay = `${it.name ?? ''} ${it.url ?? ''} ${it.uuid ?? ''} ${it.createdBy ?? ''}`.toLowerCase()
      if (!hay.includes(needle)) return false
    }
    if (cf.region?.regions != null) {
      const region = it.region ?? ''
      if (!cf.region.regions.includes(region)) return false
    }
    if (cf.mode?.modes != null) {
      if (!cf.mode.modes.includes(it.mode ?? '')) return false
    }
    if (cf.last_visit != null) {
      const d = getLastVisitDays(it)
      if (cf.last_visit.min != null && d < cf.last_visit.min) return false
      if (cf.last_visit.max != null && d > cf.last_visit.max) return false
    }
    if (cf.attempts != null) {
      const a = it.processingAttempts ?? 0
      if (cf.attempts.min != null && a < cf.attempts.min) return false
      if (cf.attempts.max != null && a > cf.attempts.max) return false
    }
    if (cf.backup_size != null) {
      const sizeMb = getBackupSize(it)
      if (cf.backup_size.min != null && sizeMb < cf.backup_size.min) return false
      if (cf.backup_size.max != null && sizeMb > cf.backup_size.max) return false
    }
    if (cf.backup_age != null) {
      const h = getBackupAgeHours(it)
      if (h == null) return false
      if (cf.backup_age.min != null && h < cf.backup_age.min) return false
      if (cf.backup_age.max != null && h > cf.backup_age.max) return false
    }
    return true
  }

  $: comparator = ((field: SortField, dir: 'asc' | 'desc') => {
    const mult = dir === 'asc' ? 1 : -1
    return (a: WorkspaceInfo, b: WorkspaceInfo): number => {
      switch (field) {
        case 'name':
          return mult * ((a.name ?? a.url ?? a.uuid) ?? '').localeCompare((b.name ?? b.url ?? b.uuid) ?? '')
        case 'region':
          return mult * (a.region ?? '').localeCompare(b.region ?? '')
        case 'last_visit':
          return mult * ((a.lastVisit ?? 0) - (b.lastVisit ?? 0))
        case 'mode':
          return mult * (a.mode ?? '').localeCompare(b.mode ?? '')
        case 'attempts':
          return mult * ((a.processingAttempts ?? 0) - (b.processingAttempts ?? 0))
        case 'progress':
          return mult * ((a.processingProgress ?? 0) - (b.processingProgress ?? 0))
        case 'backup_size':
          return mult * (getBackupSize(a) - getBackupSize(b))
        case 'backup_age':
          return mult * ((a.backupInfo?.lastBackup ?? 0) - (b.backupInfo?.lastBackup ?? 0))
      }
    }
  })(sortField, sortDir)

  $: sortedWorkspaces = workspaces.filter(matchesColumnFilters(columnFilters)).sort(comparator)

  let backupIdx = new Map<string, number>()

  const backupInterval: number = 43200

  let backupable: WorkspaceInfo[] = []

  // Long-running workspace detection (threshold 1h, TODO: env-driven via metadata)
  const longRunningThresholdHours = 1
  $: longRunningCandidates = workspaces.filter((it) => {
    const nonTerminal = !isActiveMode(it.mode) && !isArchivingMode(it.mode) && it.mode !== 'archived' && it.mode !== 'deleted'
    if (!nonTerminal) return false
    const lpt = (it as any).lastProcessingTime
    if (lpt == null) return false
    return (Date.now() - lpt) > longRunningThresholdHours * 3600_000
  })

  // Dashboard stat helpers (moved out of template — Svelte 4 only allows
  // {@const} as immediate child of {#if}/{#each}/etc., not at top-level
  // markup. Reactives compute and the template just references them).
  $: createdLast30dCount = workspaces.filter((it) => (it.createdOn ?? 0) > (Date.now() - 30 * 86400_000)).length
  $: totalStorageMb = workspaces.reduce((sum, it) => sum + getBackupSize(it), 0)
  $: totalStorageFormatted = totalStorageMb >= 1024
    ? (totalStorageMb / 1024).toFixed(1) + ' GB'
    : Math.round(totalStorageMb) + ' MB'
  $: longRunningStatCount = longRunningCandidates.length

  function onShowLongRunning (): void {
    columnFilters = { mode: { modes: ['upgrading', 'migration', 'restoring', 'archiving', 'deleting', 'reconnecting'] } }
  }

  function onResetLongRunning (): void {
    if (longRunningCandidates.length === 0) return
    showPopup(MassActionConfirm, {
      title: `Reset attempts for ${longRunningCandidates.length} workspace(s)`,
      affectedCount: longRunningCandidates.length,
      filterSummary: 'Long-running candidates',
      dangerousScope: false,
      typedConfirmPhrase: '',
      actionLabel: 'Reset attempts',
      dangerous: false
    }, 'middle', (confirmed) => {
      if (confirmed !== true) return
      void performWorkspaceOperation(
        longRunningCandidates.map((it) => it.uuid),
        'reset-attempts'
      )
    })
  }

  const token: string = getMetadata(presentation.metadata.Token) ?? ''

  // Export the *currently filtered+sorted* list as a CSV file. Generated
  // client-side because workspace list is already fully loaded — keeps
  // filter/sort parity with what the user sees, no server round-trip.
  function exportWorkspacesCsv (): void {
    const cols = ['uuid', 'name', 'url', 'mode', 'region', 'version',
      'createdOn', 'lastVisit', 'backupSizeMB', 'lastBackupAt']
    // RFC-4180 CRLF + UTF-8 BOM (D2) — see csv.ts and the accounts CSV
    // route in account-service/src/index.ts for the rationale.
    const header = cols.join(',') + '\r\n'
    const rows = sortedWorkspaces.map((w) => [
      w.uuid,
      (w as any).name ?? '',
      (w as any).url ?? '',
      w.mode ?? '',
      (w as any).region ?? '',
      ((w as any).versionMajor != null) ? `${(w as any).versionMajor}.${(w as any).versionMinor}.${(w as any).versionPatch}` : '',
      w.createdOn != null ? new Date(w.createdOn).toISOString() : '',
      w.lastVisit != null ? new Date(w.lastVisit).toISOString() : '',
      Math.round(getBackupSize(w)),
      w.backupInfo?.lastBackup != null ? new Date(w.backupInfo.lastBackup).toISOString() : ''
    ].map(csvEscape).join(',') + '\r\n').join('')
    // Use String.fromCharCode(0xFEFF) — svelte-loader strips a raw U+FEFF
    // character from string literals as parser-safety, so the byte sequence
    // EF BB BF would never land in the blob. fromCharCode bypasses that.
    const BOM = String.fromCharCode(0xFEFF)
    const blob = new Blob([BOM + header + rows], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `huly-workspaces-${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const endpoint = getMetadata(presentation.metadata.StatsUrl)

  const STATS_MIN_INTERVAL_MS = 30_000

  let lastStatsFetchMs = 0
  async function fetchStats (time: number): Promise<void> {
    if (time - lastStatsFetchMs < STATS_MIN_INTERVAL_MS) return
    lastStatsFetchMs = time
    await fetch(endpoint + `/api/v1/overview?token=${token}`, {})
      .then(async (json) => {
        data = await json.json()
      })
      .catch((err) => {
        console.error(err)
      })
  }
  let data: OverviewStatistics | undefined
  $: void fetchStats($ticker)

  $: statsByWorkspace = new Map((data?.workspaces ?? []).map((it) => [it.wsId, it]))

  $: sessionOpsByWs = new Map(
    Array.from(statsByWorkspace.entries()).map(([wsId, stats]) => [
      wsId,
      (stats.sessions ?? []).reduce(
        (sum, s) => sum + (s.mins5.tx + s.mins5.find) + (s.current.tx + s.current.find),
        0
      )
    ])
  )

  $: {
    // Assign backup idx
    const backupSorting = [...workspaces].filter((it) => {
      if (!isActiveMode(it.mode)) {
        return false
      }
      const lastBackup = it.backupInfo?.lastBackup ?? 0
      if ((now - lastBackup) / 1000 < backupInterval) {
        // No backup required, interval not elapsed
        return false
      }

      const createdOn = Math.floor((now - it.createdOn) / 1000)
      if (createdOn <= 2) {
        // Skip if we created is less 2 days
        return false
      }
      if (it.lastVisit == null) {
        return false
      }

      const lastVisitSec = Math.floor((now - it.lastVisit) / 1000)
      if (lastVisitSec > backupInterval) {
        // No backup required, interval not elapsed
        return false
      }
      return true
    })
    const newBackupIdx = new Map<string, number>()

    backupSorting.sort((a, b) => {
      return (a.backupInfo?.lastBackup ?? 0) - (b.backupInfo?.lastBackup ?? 0)
    })

    // Shift new with existing ones.
    const existingNew = groupByArray(backupSorting, (it) => it.backupInfo != null)

    const existing = existingNew.get(true) ?? []
    const newOnes = existingNew.get(false) ?? []
    const mixedBackupSorting: WorkspaceInfo[] = []

    while (existing.length > 0 || newOnes.length > 0) {
      const e = existing.shift()
      const n = newOnes.shift()
      if (e != null) {
        mixedBackupSorting.push(e)
      }
      if (n != null) {
        mixedBackupSorting.push(n)
      }
    }

    backupable = mixedBackupSorting

    for (const [idx, it] of mixedBackupSorting.entries()) {
      newBackupIdx.set(it.uuid, idx)
    }
    backupIdx = newBackupIdx
  }

  let limit = 50

  let regionInfo: RegionInfo[] = []
  let regionTitles: Record<string, string> = {}

  // Migrate-target region for the Mass Migrate button. Defaults to the
  // first region; user picks via the inline dropdown next to the button.
  let migrateTargetRegionId: string = ''

  void getRegionInfo().then((_regionInfo) => {
    regionInfo = _regionInfo ?? []
    regionTitles = Object.fromEntries(
      regionInfo.map((it) => [it.region, it.name.length !== 0 ? it.name : it.region.length > 0 ? it.region : 'Default'])
    )
    if (migrateTargetRegionId === '' && regionInfo.length > 0) {
      migrateTargetRegionId = regionInfo[0].region
    }
  })

  $: regionFilterItems = regionInfo.map((it) => ({
    id: it.region,
    label: regionTitles[it.region] ?? (it.region === '' ? 'Default' : it.region)
  }))

  $: migrateTargetRef = regionInfo.find((it) => it.region === migrateTargetRegionId)
  $: migrateTargetName =
    migrateTargetRef !== undefined
      ? migrateTargetRef.name.length > 0
        ? migrateTargetRef.name
        : migrateTargetRef.region
      : ''

  $: byVersion = groupByArray(
    workspaces.filter((it) => {
      const lastUsed = Math.round((now - (it.lastVisit ?? 0)) / (1000 * 3600 * 24))
      return isActiveMode(it.mode) && lastUsed < 1
    }),
    (it) => versionToString({ major: it.versionMajor, minor: it.versionMinor, patch: it.versionPatch })
  )

  $: byRegion = groupByArray(
    workspaces.filter((it) => isActiveMode(it.mode)),
    (it) => regionTitles[it.region ?? '']
  )

  let superAdminMode = false

  function openColumnFilter (column: string, anchor: HTMLElement): void {
    showPopup(
      WorkspaceColumnFilterPopup,
      { column, current: columnFilters[column], regions: regionFilterItems },
      anchor,
      (result: { column: string, payload: any | 'clear' } | undefined) => {
        if (result == null) return
        if (result.payload === 'clear') {
          const { [result.column]: _drop, ...rest } = columnFilters
          columnFilters = rest
        } else {
          columnFilters = { ...columnFilters, [result.column]: result.payload }
        }
      }
    )
  }

  let selectedWorkspaceUuid: string | null = null
  function openWorkspace (uuid: string): void { selectedWorkspaceUuid = uuid }
  function closeWorkspace (): void { selectedWorkspaceUuid = null }

  // Keyboard navigation — ArrowUp/Down moves focus; Enter opens drawer.
  let wsTableEl: HTMLElement
  let wsFocusedIndex = -1

  function onWsKey (ev: KeyboardEvent): void {
    // Do not hijack keys when an input or textarea is focused.
    const tag = (document.activeElement as HTMLElement | null)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return
    if (wsTableEl == null || (!wsTableEl.contains(document.activeElement) && document.activeElement !== document.body)) return
    if (visibleWorkspaces.length === 0) return
    if (ev.key === 'ArrowDown') {
      ev.preventDefault()
      wsFocusedIndex = Math.min(visibleWorkspaces.length - 1, wsFocusedIndex + 1)
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault()
      wsFocusedIndex = Math.max(0, wsFocusedIndex - 1)
    } else if (ev.key === 'Enter' && wsFocusedIndex >= 0) {
      ev.preventDefault()
      openWorkspace(visibleWorkspaces[wsFocusedIndex].uuid)
    }
  }

  onMount(() => {
    document.addEventListener('keydown', onWsKey)
  })
  onDestroy(() => {
    document.removeEventListener('keydown', onWsKey)
  })

  // Flat list cap. The previous UI grouped rows into Hour/Day/Weeks/...
  // <Expandable> buckets — that bucketing is now gone (one flat sortable
  // list is enough for the typical admin workload). Limit lets us cap
  // very large tenants while still offering a "Load more" button.
  $: visibleWorkspaces = sortedWorkspaces.slice(0, limit)
  $: hasMore = sortedWorkspaces.length > limit

  // Active workspaces in the current filtered list — kept for context
  // (e.g. selection-count hints) but Mass Archive / Mass Migrate now
  // operate on `selectedActiveWorkspaces` (checkbox-driven subset).
  $: massActiveAll = sortedWorkspaces.filter((it) => isActiveMode(it.mode))
  $: massActiveMigratable = massActiveAll.filter((it) => (it.region ?? '') !== migrateTargetRegionId)

  // Per-row selection state — parity with AdminUsers page.
  // Selection survives filter changes (UUIDs are stable), but Mass-action
  // buttons gate on the intersection of selection + currently visible +
  // isActiveMode so admins only ever archive/migrate what they can see.
  let selectedWorkspaceUuids: Set<string> = new Set()

  function clearWsSelection (): void {
    selectedWorkspaceUuids = new Set()
  }

  function toggleWsSelection (uuid: string, selected: boolean): void {
    const next = new Set(selectedWorkspaceUuids)
    if (selected) next.add(uuid)
    else next.delete(uuid)
    selectedWorkspaceUuids = next
  }

  function toggleAllWsSelection (selected: boolean): void {
    const next = new Set(selectedWorkspaceUuids)
    for (const w of visibleWorkspaces) {
      if (selected) next.add(w.uuid)
      else next.delete(w.uuid)
    }
    selectedWorkspaceUuids = next
  }

  // Subset of currently visible workspaces that are (a) checked by the
  // admin AND (b) in an active mode. Non-active rows (archiving / migrating
  // / archived / deleting / ...) are skipped — Mass Archive / Mass Migrate
  // only make sense on active workspaces.
  $: selectedActiveWorkspaces = visibleWorkspaces.filter(
    (w) => selectedWorkspaceUuids.has(w.uuid) && isActiveMode(w.mode)
  )
  $: selectedMigratableWorkspaces = selectedActiveWorkspaces.filter(
    (it) => (it.region ?? '') !== migrateTargetRegionId
  )

  // Filter-summary string used by MassActionConfirm. Builds from the
  // currently-applied columnFilters keys; if no filter is active, returns
  // the explicit "No filter set" warning so admins see the universe size
  // they're about to act on.
  $: activeFilterKeys = Object.keys(columnFilters).filter((k) => columnFilters[k] != null)
  $: filterSummary = activeFilterKeys.length === 0
    ? 'No filter set'
    : `Filter: ${activeFilterKeys.join(', ')}`

  // dangerousScope = true when admin would act on the entire universe.
  // For Workspaces this means: no filter set AND the action targets all
  // active workspaces in the instance. Both mass actions on this page
  // operate on the full filtered set, so no-filter = universe = dangerous.
  $: workspacesDangerousScope = activeFilterKeys.length === 0

  // Issue 17: Add-workspace shortcut for admins. The actual creation
  // flow already exists at /login/createWorkspace (CreateWorkspace.svelte);
  // the button just jumps there. An inline popup would be nicer but
  // duplicates the multi-step creation form, so reuse is the safer
  // minimum-diff option.
  function openCreateWorkspace (): void {
    goTo('createWorkspace')
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
{#if isAdmin}
<AdminShell section="workspaces">
  <div class="hulyComponent">
    <Header adaptive={'disabled'}>
      <Breadcrumb icon={IconSettings} label={login.string.AdminWorkspaces} size={'large'} isCurrent />
      <svelte:fragment slot="actions">
        <label class="super-admin-toggle flex-row-center">
          <CheckBox bind:checked={superAdminMode} />
          <span class="ml-2">Enable deletion</span>
        </label>
      </svelte:fragment>
    </Header>

    <div class="hulyComponent-content__column content admin-ws">
      <Scroller align={'stretch'} padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
        <div class="hulyComponent-content withoutMaxWidth">

        <!-- Stat cards mirror the Users page so both admin sections share the same visual rhythm.
             Plan 1e V7: split into two bands — counts (brand-default) vs capacity (muted accent). -->
        <div class="ws-stats ws-stats-counts">
          <div class="stat-item">
            <span class="stat-label">Total</span>
            <span class="stat-value">{workspaces.length}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Active</span>
            <span class="stat-value stat-positive">{workspaces.filter((it) => isActiveMode(it.mode)).length}</span>
          </div>
          {#if workspaces.filter((it) => isUpgradingMode(it.mode)).length > 0}
            <div class="stat-item">
              <span class="stat-label">Upgrading</span>
              <span class="stat-value">{workspaces.filter((it) => isUpgradingMode(it.mode)).length}</span>
            </div>
          {/if}
          {#if data != null}
            <div class="stat-item">
              <span class="stat-label">With active sessions</span>
              <span class="stat-value">{data.workspaces.length}</span>
            </div>
          {/if}
          <div class="stat-item">
            <span class="stat-label">Users</span>
            <span class="stat-value">{data?.usersTotal ?? 0}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Connections</span>
            <span class="stat-value">{data?.connectionsTotal ?? 0}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Created 30d</span>
            <span class="stat-value">{createdLast30dCount}</span>
          </div>
          {#if longRunningStatCount > 0}
            <div class="stat-item stat-warning">
              <span class="stat-label">Long-running &gt; 1h</span>
              <span class="stat-value">{longRunningStatCount}</span>
            </div>
          {/if}
        </div>
        <div class="ws-stats ws-stats-capacity">
          <div class="stat-item">
            <span class="stat-label">Total Storage</span>
            <span class="stat-value">{totalStorageFormatted}</span>
            {#if totalStorageMb === 0}
              <span class="stat-hint">No backup data yet</span>
            {/if}
          </div>
        </div>

        {#if byVersion.size > 0 || byRegion.size > 0}
          <div class="ws-breakdown">
            {#if byVersion.size > 0}
              <div class="ws-breakdown-row">
                <span class="ws-breakdown-label">By version:</span>
                {#each byVersion.entries() as [k, v]}
                  <span class="ws-chip">{k}<span class="ws-chip-count">{v.length}</span></span>
                {/each}
              </div>
            {/if}
            {#if byRegion.size > 0}
              <div class="ws-breakdown-row">
                <span class="ws-breakdown-label">By region:</span>
                {#each byRegion.entries() as [k, v]}
                  <span class="ws-chip">{k ?? '—'}<span class="ws-chip-count">{v.length}</span></span>
                {/each}
              </div>
            {/if}
          </div>
        {/if}

        <LongRunningWorkspaceBanner
          candidates={longRunningCandidates}
          thresholdHours={longRunningThresholdHours}
          on:show-all={onShowLongRunning}
          on:reset-attempts={onResetLongRunning}
        />

        <div class="ws-list-toolbar">
          <div class="ws-list-toolbar-title">
            Workspaces
            <span class="ws-list-count">
              {#if hasMore}{visibleWorkspaces.length} of {sortedWorkspaces.length}{:else}{sortedWorkspaces.length}{/if}
            </span>
          </div>
          <div class="ws-list-toolbar-actions">
            <Button
              kind={'ghost'}
              size={'small'}
              label={getEmbeddedLabel('Top 10 by storage')}
              disabled={totalStorageMb === 0}
              on:click={() => {
                columnFilters = {}
                sortField = 'backup_size'
                sortDir = 'desc'
              }}
            />
            <FilterPresetMenu
              storageKey={'workspaces'}
              currentState={{ filters: columnFilters, sort: { field: sortField, direction: sortDir } }}
              on:apply={(e) => {
                const p = e.detail
                columnFilters = p.filters ?? {}
                if (p.sort != null) {
                  sortField = p.sort.field ?? 'name'
                  sortDir = p.sort.direction ?? 'asc'
                }
              }}
            />
            <Button
              kind={'regular'}
              size={'small'}
              label={getEmbeddedLabel('Export CSV')}
              on:click={exportWorkspacesCsv}
            />
            <!-- Issue 17: primary "Add workspace" shortcut; navigates
                 to the existing /login/createWorkspace flow. -->
            <Button
              kind={'primary'}
              size={'small'}
              label={getEmbeddedLabel('Add workspace')}
              on:click={openCreateWorkspace}
            />
            {#if selectedWorkspaceUuids.size > 0}
              <span class="ws-selected-count">
                Selected: {selectedWorkspaceUuids.size}
                {#if selectedActiveWorkspaces.length !== selectedWorkspaceUuids.size}
                  <span class="ws-selected-active">· {selectedActiveWorkspaces.length} active</span>
                {/if}
                <button class="ws-clear-sel" on:click={clearWsSelection}>Clear</button>
              </span>
            {/if}
            {#if selectedActiveWorkspaces.length > 0}
              <Button
                icon={IconStop}
                size={'small'}
                kind={'ghost'}
                label={getEmbeddedLabel(`Mass Archive ${selectedActiveWorkspaces.length}`)}
                on:click={() => {
                  showPopup(
                    MassActionConfirm,
                    {
                      title: `Mass Archive ${selectedActiveWorkspaces.length}`,
                      affectedCount: selectedActiveWorkspaces.length,
                      filterSummary,
                      // Selection-based: admin already explicitly picked
                      // the rows, no "universe" warning needed.
                      dangerousScope: false,
                      typedConfirmPhrase: 'ARCHIVE ALL',
                      actionLabel: 'Archive',
                      dangerous: true
                    },
                    'middle',
                    (confirmed) => {
                      if (confirmed !== true) return
                      void performWorkspaceOperation(selectedActiveWorkspaces.map((it) => it.uuid), 'archive')
                    }
                  )
                }}
              />
            {/if}
            {#if regionInfo.length > 1 && selectedMigratableWorkspaces.length > 0}
              <span class="ws-migrate-region-label">to</span>
              <ButtonMenu
                selected={migrateTargetRegionId}
                title={migrateTargetName}
                items={regionInfo.map((it) => ({
                  id: it.region === '' ? '#' : it.region,
                  label: getEmbeddedLabel(it.name.length > 0 ? it.name : it.region + ' (hidden)')
                }))}
                on:selected={(it) => {
                  migrateTargetRegionId = it.detail === '#' ? '' : it.detail
                }}
              />
              <Button
                icon={IconArrowRight}
                size={'small'}
                kind={'positive'}
                label={getEmbeddedLabel(`Mass Migrate ${selectedMigratableWorkspaces.length}`)}
                on:click={() => {
                  showPopup(
                    MassActionConfirm,
                    {
                      title: `Mass Migrate ${selectedMigratableWorkspaces.length} → ${migrateTargetName}`,
                      affectedCount: selectedMigratableWorkspaces.length,
                      filterSummary,
                      dangerousScope: false,
                      typedConfirmPhrase: 'MIGRATE ALL',
                      actionLabel: 'Migrate',
                      dangerous: false
                    },
                    'middle',
                    (confirmed) => {
                      if (confirmed !== true) return
                      void performWorkspaceOperation(selectedMigratableWorkspaces.map((it) => it.uuid), 'migrate-to', migrateTargetRegionId)
                    }
                  )
                }}
              />
            {/if}
          </div>
        </div>

        <div aria-live="polite" class="ws-sr-only">
          Showing {visibleWorkspaces.length} of {sortedWorkspaces.length} workspace{sortedWorkspaces.length !== 1 ? 's' : ''}
        </div>
        <div class="ws-table" bind:this={wsTableEl} tabindex="0" role="grid" aria-rowcount={visibleWorkspaces.length + 1}>
          <!-- Grid header: every row inherits the same grid-template via display:contents -->
          <div class="ws-row ws-head">
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div class="ws-cell ws-cell-checkbox" on:click|stopPropagation>
              <CheckBox
                checked={visibleWorkspaces.length > 0 && visibleWorkspaces.every((w) => selectedWorkspaceUuids.has(w.uuid))}
                on:value={(e) => toggleAllWsSelection(e.detail)}
              />
            </div>
            {#each [
              { field: 'name', label: 'Name', filter: true },
              { field: 'region', label: 'Region', filter: true },
              { field: 'last_visit', label: 'Last visit', filter: true, num: true },
              { field: 'mode', label: 'Mode', filter: true },
              { field: 'attempts', label: 'Attempts', filter: true, num: true },
              { field: 'progress', label: 'Progress', filter: false, num: true },
              { field: 'backup_size', label: 'Storage', filter: true },
              { field: 'backup_age', label: 'Backup age', filter: true },
            ] as col}
              <div class="ws-cell ws-head-cell" class:ws-cell-num={col.num} class:ws-is-sorted={sortField === col.field}>
                <span class="ws-hdr-label" on:click={() => setSort(col.field)}>
                  {#if sortField === col.field}<span class="ws-sort-arrow">{sortDir === 'asc' ? '↑' : '↓'}</span>{/if}{col.label}
                </span>
                {#if col.filter}
                  <button
                    class="ws-filter-btn"
                    class:active={columnFilters[col.field] != null}
                    title={`Filter by ${col.label}`}
                    on:click|stopPropagation={(e) => openColumnFilter(col.field, e.currentTarget)}
                  >
                    <Icon icon={IconFilter} size={'x-small'} />
                  </button>
                {/if}
              </div>
            {/each}
            <div class="ws-cell ws-cell-actions">Actions</div>
          </div>

          {#if visibleWorkspaces.length === 0}
            <div class="ws-empty">No workspaces match the current filters.</div>
          {:else}
            {#each visibleWorkspaces as workspace, wsIdx (workspace.uuid)}
              {@const wsName = workspace.name}
              {@const lastUsageDays = Math.round((now - (workspace.lastVisit ?? 0)) / (1000 * 3600 * 24))}
              {@const bIdx = backupIdx.get(workspace.uuid)}
              {@const stats = statsByWorkspace.get(workspace.uuid ?? '')}
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div class="ws-row ws-body" role="row" aria-rowindex={wsIdx + 2} class:ws-is-focused={wsIdx === wsFocusedIndex} class:ws-is-active={workspace.uuid === selectedWorkspaceUuid} on:click={() => openWorkspace(workspace.uuid)}>
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div class="ws-cell ws-cell-checkbox" on:click|stopPropagation>
                  <CheckBox
                    checked={selectedWorkspaceUuids.has(workspace.uuid)}
                    on:value={(e) => toggleWsSelection(workspace.uuid, e.detail)}
                  />
                </div>
                <div class="ws-cell ws-cell-name" title={wsName}>
                  <span class="ws-name-text">{wsName}</span>
                  {#if stats}
                    <span class="ws-name-stats" title="active sessions · ops in last 5m">
                      {stats.sessions?.length ?? 0}
                      ·
                      {sessionOpsByWs.get(workspace.uuid ?? '') ?? 0}
                    </span>
                  {/if}
                  <div class="ws-name-actions" on:click|stopPropagation>
                    <Button
                      icon={IconOpen}
                      size={'small'}
                      kind={'ghost'}
                      on:click={() => select(workspace.url)}
                      showTooltip={{ label: getEmbeddedLabel('Open Workspace URL') }}
                    />
                    <Button
                      icon={IconCopy}
                      size={'small'}
                      kind={'ghost'}
                      on:click={() => copyTextToClipboard(workspace.uuid)}
                      showTooltip={{ label: getEmbeddedLabel('Copy UUID') }}
                    />
                  </div>
                </div>
                <div class="ws-cell">{workspace.region ?? ''}</div>
                <div class="ws-cell ws-cell-num">{lastUsageDays}d</div>
                <div class="ws-cell">
                  <span class="ws-mode mode-{workspace.mode}">{workspace.mode ?? '-'}</span>
                </div>
                <div class="ws-cell ws-cell-num" on:click|stopPropagation>
                  {workspace.processingAttempts}
                  {#if workspace.processingAttempts > 0}
                    <Button
                      icon={IconDownOutline}
                      size={'small'}
                      kind={'ghost'}
                      on:click={() => {
                        showPopup(MessageBox, {
                          label: getEmbeddedLabel(`Reset attempts ${workspace.url}`),
                          message: getEmbeddedLabel('Please confirm'),
                          action: async () => {
                            await performWorkspaceOperation(workspace.uuid, 'reset-attempts')
                          }
                        })
                      }}
                    />
                  {/if}
                </div>
                <div class="ws-cell ws-cell-num">
                  {#if workspace.processingProgress !== 100 && workspace.processingProgress !== 0}
                    {workspace.processingProgress}%
                  {/if}
                </div>
                <div class="ws-cell">
                  {#if workspace.backupInfo != null}
                    {@const sz = Math.max(
                      workspace.backupInfo.backupSize,
                      workspace.backupInfo.dataSize + workspace.backupInfo.blobsSize
                    )}
                    {@const szGb = Math.round((sz * 100) / 1024) / 100}
                    {#if szGb > 0}
                      {szGb} GB
                    {:else}
                      {Math.round(sz * 100) / 100} MB
                    {/if}
                    {#if bIdx != null}
                      <span class="ws-backup-idx">[#{bIdx}]</span>
                    {/if}
                  {:else}
                    <span class="ws-muted">—</span>
                  {/if}
                </div>
                <div class="ws-cell">
                  {#if workspace.backupInfo != null}
                    {@const hours = Math.round((now - workspace.backupInfo.lastBackup) / (1000 * 3600))}
                    {#if hours > 24}
                      {Math.round(hours / 24)}d ago
                    {:else}
                      {hours}h ago
                    {/if}
                  {:else}
                    <span class="ws-muted">—</span>
                  {/if}
                </div>
                <div class="ws-cell ws-cell-actions" on:click|stopPropagation>
                  {#if workspace.mode === 'active'}
                    <Button
                      icon={IconStop}
                      size={'small'}
                      kind={'ghost'}
                      label={getEmbeddedLabel('Archive')}
                      on:click={() => {
                        showPopup(MessageBox, {
                          label: getEmbeddedLabel(`Archive ${workspace.url}`),
                          message: getEmbeddedLabel('Please confirm'),
                          action: async () => {
                            await performWorkspaceOperation(workspace.uuid, 'archive')
                          }
                        })
                      }}
                    />
                  {/if}
                  {#if workspace.mode === 'archived'}
                    <Button
                      icon={IconStart}
                      size={'small'}
                      kind={'ghost'}
                      label={getEmbeddedLabel('Unarchive')}
                      on:click={() => {
                        showPopup(MessageBox, {
                          label: getEmbeddedLabel(`Unarchive ${workspace.url}`),
                          message: getEmbeddedLabel('Please confirm'),
                          action: async () => {
                            await performWorkspaceOperation(workspace.uuid, 'unarchive')
                          }
                        })
                      }}
                    />
                  {/if}
                  {#if regionInfo.length > 0 && workspace.mode === 'active' && (workspace.region ?? '') !== migrateTargetRegionId}
                    <Button
                      icon={IconArrowRight}
                      size={'small'}
                      kind={'positive'}
                      label={getEmbeddedLabel('Migrate')}
                      on:click={() => {
                        showPopup(MessageBox, {
                          label: getEmbeddedLabel(`Migrate ${workspace.url}`),
                          message: getEmbeddedLabel('Please confirm'),
                          action: async () => {
                            await performWorkspaceOperation(workspace.uuid, 'migrate-to', migrateTargetRegionId)
                          }
                        })
                      }}
                    />
                  {/if}
                  {#if superAdminMode && !isDeletingMode(workspace.mode) && !isArchivingMode(workspace.mode)}
                    <Button
                      icon={IconStop}
                      size={'small'}
                      kind={'dangerous'}
                      label={getEmbeddedLabel('Delete')}
                      on:click={() => {
                        showPopup(MessageBox, {
                          label: getEmbeddedLabel(`Delete ${workspace.url}`),
                          message: getEmbeddedLabel('Please confirm'),
                          action: async () => {
                            await performWorkspaceOperation(workspace.uuid, 'delete')
                          }
                        })
                      }}
                    />
                  {/if}
                </div>
              </div>
            {/each}
          {/if}
        </div>

        {#if hasMore}
          <div class="ws-load-more">
            <Button
              kind={'regular'}
              label={getEmbeddedLabel(`Load more (${sortedWorkspaces.length - limit} left)`)}
              on:click={() => { limit += 50 }}
            />
          </div>
        {/if}

        </div>
      </Scroller>
    </div>
  </div>
</AdminShell>
{#if selectedWorkspaceUuid != null}
  <AdminWorkspaceDrawer workspaceUuid={selectedWorkspaceUuid} on:close={closeWorkspace} />
{/if}
{/if}

<style lang="scss">
  :global(.admin-ws .hulyComponent-content) {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .ws-stats {
    width: 100%;
    box-sizing: border-box;
    display: grid;
    // Auto-wrap stat tiles instead of forcing 6 columns; under ~1200px the
    // fixed 6-col grid squeezes 4-digit numbers into 2 lines and crushes
    // long labels (e.g. "Long-running candidates").
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: var(--spacing-2);
  }

  // Plan 1e V7: two-band styling — counts (default) vs capacity (muted accent).
  .ws-stats-capacity {
    margin-top: var(--spacing-1);

    .stat-item {
      background: var(--theme-bg-accent-color);

      .stat-label { opacity: 0.7; }
    }
  }

  .ws-breakdown {
    width: 100%;
    box-sizing: border-box;
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
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--theme-darker-color);
  }

  .stat-value {
    font-size: 1.3rem;
    font-weight: 500;
    color: var(--theme-caption-color);
    line-height: 1.1;
  }

  .stat-sub {
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--theme-darker-color);
    margin-left: 0.25rem;
  }

  .stat-hint {
    font-size: 0.72rem;
    color: var(--theme-darker-color);
    opacity: 0.7;
  }

  .stat-positive {
    color: var(--theme-state-positive-color, #10b981);
  }

  .stat-warning {
    border-color: rgba(245, 158, 11, 0.5);
    background: rgba(245, 158, 11, 0.06);
    .stat-value { color: #b45309; }
  }

  .ws-breakdown {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: var(--spacing-2);
    background: var(--theme-bg-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--small-BorderRadius);
  }

  .ws-breakdown-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
  }

  .ws-breakdown-label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--theme-darker-color);
    margin-right: 0.25rem;
  }

  .ws-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.1rem 0.45rem;
    background: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: 999px;
    font-size: 0.78rem;
    color: var(--theme-content-color);
    font-variant-numeric: tabular-nums;
  }

  .ws-chip-count {
    font-weight: 600;
    color: var(--theme-caption-color);
  }

  .ws-list-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-2);
    padding: 0.25rem 0.1rem;
  }

  .ws-list-toolbar-title {
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--theme-caption-color);
  }

  .ws-list-count {
    margin-left: 0.4rem;
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--theme-darker-color);
    font-variant-numeric: tabular-nums;
  }

  .ws-list-toolbar-actions {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  /* Flat workspaces table — one shared grid for head + every row.
     Rows use display:contents so each cell participates in the parent
     grid directly, guaranteeing column alignment. */
  .ws-table {
    display: grid;
    grid-template-columns:
      2.25rem            /* Checkbox */
      minmax(260px, 2fr) /* Name + open/copy buttons */
      80px               /* Region */
      90px               /* Last visit (days) */
      120px              /* Mode */
      90px               /* Attempts */
      80px               /* Progress */
      140px              /* Backup size */
      120px              /* Backup age */
      minmax(220px, 1fr); /* Actions */
    align-items: stretch;
    width: 100%;
    background: var(--theme-bg-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--small-BorderRadius);
    overflow: hidden;
  }

  .ws-row {
    display: contents;
  }

  .ws-cell {
    min-height: 48px;
    padding: 0 0.85rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--theme-content-color);
    min-width: 0;
    border-bottom: 1px solid var(--theme-divider-color);
    background: var(--theme-bg-color);
    transition: background 80ms ease;
  }

  .ws-head .ws-cell {
    min-height: 40px;
    background: var(--theme-bg-accent-color);
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--theme-darker-color);
    white-space: nowrap;
    gap: 0.35rem;
  }

  .ws-hdr-label {
    cursor: pointer;
    user-select: none;

    &:hover {
      color: var(--theme-caption-color);
    }
  }

  .ws-sort-arrow {
    display: inline-block;
    width: 0.75rem;
    margin-right: 0.15rem;
    color: var(--theme-caption-color);
    font-weight: 700;
  }

  .ws-head .ws-is-sorted {
    background: var(--theme-bg-color);
    color: var(--theme-caption-color);
    font-weight: 600;
  }

  .ws-filter-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 0;
    padding: 0.1rem 0.25rem;
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

    &.active {
      opacity: 1;
      color: #2563eb;
      background: rgba(96, 165, 250, 0.18);
    }
  }

  .ws-migrate-region-label {
    font-size: 0.78rem;
    color: var(--theme-darker-color);
  }

  .ws-body {
    cursor: pointer;
  }

  .ws-body:hover .ws-cell {
    background: var(--theme-list-row-color, rgba(96, 165, 250, 0.06));
  }

  /* Keyboard-focused workspace row. */
  .ws-body.ws-is-focused .ws-cell {
    outline: 2px solid var(--theme-button-focused-border, var(--primary-button-color, #2563eb));
    outline-offset: -2px;
  }

  /* Drawer-open workspace row — matches the AdminUsers .is-active pattern.
     Stronger than the default row stripe so it's obvious even when the
     cursor moves away to interact with the drawer. Left bar on the first
     cell anchors the eye. */
  .ws-body.ws-is-active .ws-cell {
    background: rgba(96, 165, 250, 0.14);
  }
  .ws-body.ws-is-active .ws-cell-checkbox {
    box-shadow: inset 3px 0 0 var(--theme-button-focused-border, var(--primary-button-color, #2563eb));
  }

  .ws-cell-num {
    font-variant-numeric: tabular-nums;
  }

  .ws-cell-checkbox {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .ws-selected-count {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.15rem 0.5rem;
    font-size: 0.78rem;
    color: var(--theme-caption-color);
    background: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: 999px;
    font-variant-numeric: tabular-nums;
  }

  .ws-selected-active {
    color: var(--theme-darker-color);
    font-weight: normal;
    margin-left: 0.25rem;
  }

  .ws-clear-sel {
    background: transparent;
    border: 0;
    padding: 0 0.25rem;
    cursor: pointer;
    color: var(--theme-darker-color);
    font-size: 0.72rem;
    text-decoration: underline;

    &:hover {
      color: var(--theme-caption-color);
    }
  }

  .ws-cell-actions {
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .ws-cell-name {
    min-width: 0;
  }

  .ws-name-text {
    color: var(--theme-caption-color);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    flex: 1;
  }

  .ws-name-stats {
    flex-shrink: 0;
    font-size: 0.72rem;
    color: var(--theme-darker-color);
    font-variant-numeric: tabular-nums;
    background: var(--theme-bg-accent-color);
    border-radius: 999px;
    padding: 0.05rem 0.5rem;
  }

  .ws-name-actions {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
  }

  .ws-mode {
    display: inline-flex;
    align-items: center;
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 500;
    text-transform: capitalize;
    background: var(--theme-bg-accent-color);
    color: var(--theme-darker-color);
    border: 1px solid var(--theme-divider-color);
  }

  .ws-mode.mode-active {
    background: rgba(16, 185, 129, 0.10);
    color: #059669;
    border-color: rgba(16, 185, 129, 0.32);
  }

  .ws-mode.mode-archived {
    background: rgba(120, 113, 108, 0.14);
    color: #57534e;
    border-color: rgba(120, 113, 108, 0.32);
  }

  .ws-mode.mode-deleting,
  .ws-mode.mode-deleted {
    background: rgba(239, 68, 68, 0.14);
    color: #b91c1c;
    border-color: rgba(239, 68, 68, 0.32);
  }

  .ws-muted {
    color: var(--theme-darker-color);
  }

  .ws-backup-idx {
    color: var(--theme-darker-color);
    font-size: 0.72rem;
    font-variant-numeric: tabular-nums;
  }

  .ws-empty {
    grid-column: 1 / -1;
    padding: var(--spacing-4);
    text-align: center;
    color: var(--theme-darker-color);
    font-size: 0.9rem;
  }

  .ws-load-more {
    display: flex;
    justify-content: center;
    margin-top: var(--spacing-2);
  }

  .ws-sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .super-admin-toggle {
    display: inline-flex;
    align-items: center;
    font-size: 0.85rem;
    color: var(--theme-content-color);
    cursor: pointer;
  }

</style>
