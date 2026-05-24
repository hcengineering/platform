<script lang="ts">
  import { RegionInfo, AccountAggregatedInfo } from '@hcengineering/account-client'
  import {
    AccountUuid,
    groupByArray,
    isActiveMode,
    isArchivingMode,
    isDeletingMode,
    isMigrationMode,
    isRestoringMode,
    isUpgradingMode,
    reduceCalls,
    systemAccountUuid,
    versionToString,
    type WorkspaceInfoWithStatus
  } from '@hcengineering/core'
  import { getEmbeddedLabel, getMetadata } from '@hcengineering/platform'
  import presentation, {
    copyTextToClipboard,
    isAdminUser,
    MessageBox,
    type OverviewStatistics,
    type WorkspaceStatistics
  } from '@hcengineering/presentation'
  import {
    Button,
    ButtonMenu,
    CheckBox,
    Expandable,
    IconArrowRight,
    IconCopy,
    IconDownOutline,
    IconOpen,
    IconStart,
    IconStop,
    locationToUrl,
    Popup,
    Scroller,
    SearchEdit,
    showPopup,
    ticker
  } from '@hcengineering/ui'
  import { workbenchId } from '@hcengineering/workbench'
  import { getAccountClient, getAllWorkspaces, getRegionInfo, performWorkspaceOperation } from '../utils'
  import AdminShell from './admin-shell/AdminShell.svelte'
  import AdminWorkspaceDrawer from './admin-workspaces/AdminWorkspaceDrawer.svelte'
  import { Breadcrumb, Header, IconSettings } from '@hcengineering/ui'
  import login from '@hcengineering/login'

  $: now = $ticker

  $: isAdmin = isAdminUser()

  const accountClient = getAccountClient()

  let search: string = ''

  async function select (workspace: string): Promise<void> {
    const url = locationToUrl({ path: [workbenchId, workspace] })
    window.open(url, '_blank')
  }

  type WorkspaceInfo = WorkspaceInfoWithStatus & { processingAttempts: number }

  let workspaces: WorkspaceInfo[] = []

  enum SortingRule {
    Activity = '1',
    Name = '2',
    BackupDate = '3',
    BackupSize = '4',
    LastVisit = '5'
  }

  let sortingRule = SortingRule.Activity

  const sortRules = {
    [SortingRule.Activity]: 'Active users',
    [SortingRule.Name]: 'Name',
    [SortingRule.BackupDate]: 'Backup date',
    [SortingRule.BackupSize]: 'Backup size',
    [SortingRule.LastVisit]: 'Last visit'
  }

  const updateWorkspaces = reduceCalls(async (_: number) => {
    const res = await getAllWorkspaces()
    workspaces = res as WorkspaceInfo[]
  })

  $: void updateWorkspaces($ticker)

  // Individual filters

  let showActive: boolean = true
  let showArchived: boolean = false
  let showDeleted: boolean = false
  let showOther: boolean = true
  let showGrAttempts: boolean = true
  let showSelectedRegionOnly: boolean = false
  let showInactive = false

  function isWorkspaceInactive (it: WorkspaceInfo, stats: WorkspaceStatistics | undefined): boolean {
    if (stats === undefined) {
      return true
    }
    const ops = (stats.sessions ?? []).reduceRight(
      (p, it) => p + (it.mins5.tx + it.mins5.find) + (it.current.tx + it.current.find),
      0
    )
    if (ops === 0) {
      return true
    }
    if (stats.sessions.filter((it) => (it.userId as any) !== systemAccountUuid).length === 0) {
      return true
    }
    return false
  }

  function getBackupSize (workspace: WorkspaceInfo): number {
    return Math.max(
      workspace.backupInfo?.backupSize ?? 0,
      (workspace.backupInfo?.dataSize ?? 0) + (workspace.backupInfo?.blobsSize ?? 0)
    )
  }

  $: sortedWorkspaces = workspaces
    .filter(
      (it) =>
        ((it.name?.includes(search) ?? false) ||
          (it.url?.includes(search) ?? false) ||
          it.uuid?.includes(search) ||
          it.createdBy?.includes(search)) &&
        (showSelectedRegionOnly ? it.region === filterRegionId : true) &&
        (showInactive ? isWorkspaceInactive(it, statsByWorkspace.get(it.uuid)) : true) &&
        ((showActive && isActiveMode(it.mode)) ||
          (showArchived && isArchivingMode(it.mode)) ||
          (showDeleted && isDeletingMode(it.mode)) ||
          (showOther &&
            (isMigrationMode(it.mode) ||
              isRestoringMode(it.mode) ||
              isUpgradingMode(it.mode) ||
              (isArchivingMode(it.mode) && it.mode !== 'archived'))) ||
          (showGrAttempts && it.processingAttempts > 0))
    )
    .sort((a, b) => {
      switch (sortingRule) {
        case SortingRule.Activity: {
          const aStats = statsByWorkspace.get(a.uuid ?? '')
          const bStats = statsByWorkspace.get(b.uuid ?? '')
          return (bStats?.sessions?.length ?? 0) - (aStats?.sessions?.length ?? 0)
        }
        case SortingRule.BackupDate: {
          return (a.backupInfo?.lastBackup ?? 0) - (b.backupInfo?.lastBackup ?? 0)
        }
        case SortingRule.BackupSize:
          return getBackupSize(b) - getBackupSize(a)
        case SortingRule.LastVisit:
          return (b.lastVisit ?? 0) - (a.lastVisit ?? 0)
      }
      return (b.url ?? b.uuid).localeCompare(a.url ?? a.uuid)
    })

  let backupIdx = new Map<string, number>()

  const backupInterval: number = 43200

  let backupable: WorkspaceInfo[] = []

  const token: string = getMetadata(presentation.metadata.Token) ?? ''

  const endpoint = getMetadata(presentation.metadata.StatsUrl)

  async function fetchStats (time: number): Promise<void> {
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

  const dayRanges = {
    Hour: [-1, 0.1],
    HalfDay: [0.1, 0.5],
    Day: [0.5, 1],
    Week: [1, 7],
    Weeks: [7, 14],
    Month: [14, 30],
    Months1: [30, 60],
    Months2: [60, 90],
    Months3: [90, 180],
    'Six Month': [180, 270],
    'Nine Months': [270, 365],
    Years: [365, 10000000]
  }

  let limit = 50

  $: groupped = groupByArray(sortedWorkspaces, (it) => {
    const lastUsageDays = Math.round((10 * (now - (it.lastVisit ?? 0))) / (1000 * 3600 * 24)) / 10
    return Object.entries(dayRanges).find(([_k, v]) => v[0] < lastUsageDays && lastUsageDays <= v[1])?.[0] ?? 'Years'
  })

  let regionInfo: RegionInfo[] = []

  let regionTitles: Record<string, string> = {}

  let selectedRegionId: string = ''

  let filterRegionId: string = ''

  void getRegionInfo().then((_regionInfo) => {
    regionInfo = _regionInfo ?? []
    regionTitles = Object.fromEntries(
      regionInfo.map((it) => [it.region, it.name.length !== 0 ? it.name : it.region.length > 0 ? it.region : 'Default'])
    )
    if (selectedRegionId === '' && regionInfo.length > 0) {
      selectedRegionId = regionInfo[0].region
    }
    if (filterRegionId === '' && regionInfo.length > 0) {
      filterRegionId = regionInfo[0].region
    }
  })

  $: selectedRegionRef = regionInfo.find((it) => it.region === selectedRegionId)
  $: selectedRegionName =
    selectedRegionRef !== undefined
      ? selectedRegionRef.name.length > 0
        ? selectedRegionRef.name
        : selectedRegionRef.region
      : ''

  $: filteredRegionRef = regionInfo.find((it) => it.region === filterRegionId)
  $: filteredRegionName =
    filteredRegionRef !== undefined
      ? filteredRegionRef.name.length > 0
        ? filteredRegionRef.name
        : filteredRegionRef.region
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
  let accountSuperAdminMode = false

  let accountSearch = ''
  let accountSkip = 0
  const accountLimit = 10
  let accounts: AccountAggregatedInfo[] = []

  const loadAccounts = reduceCalls(async (search?: string, skip?: number, limit?: number): Promise<void> => {
    console.log('Called loadAccounts', search, skip, limit)
    accounts = await accountClient.listAccounts(search, skip, limit)
  })

  void loadAccounts(accountSearch, accountSkip, accountLimit)

  async function deleteAccount (uuid: AccountUuid): Promise<void> {
    await accountClient.deleteAccount(uuid)
  }

  async function accountSearchChanged (ev: CustomEvent<string>): Promise<void> {
    accountSkip = 0
    await loadAccounts(ev.detail, accountSkip, accountLimit)
  }

  let selectedWorkspaceUuid: string | null = null
  function openWorkspace (uuid: string): void { selectedWorkspaceUuid = uuid }
  function closeWorkspace (): void { selectedWorkspaceUuid = null }
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

        <!-- Stat cards mirror the Users page so both admin sections share the same visual rhythm. -->
        <div class="ws-stats">
          <div class="stat-item">
            <span class="stat-label">Total</span>
            <span class="stat-value">{workspaces.length}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Active</span>
            <span class="stat-value stat-positive">{workspaces.filter((it) => isActiveMode(it.mode)).length}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Upgrading</span>
            <span class="stat-value">{workspaces.filter((it) => isUpgradingMode(it.mode)).length}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Backupable</span>
            <span class="stat-value">
              {backupable.length}
              <span class="stat-sub">
                ({backupable.reduce((p, it) => p + (it.backupInfo == null ? 1 : 0), 0)} new)
              </span>
            </span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Live</span>
            <span class="stat-value">{data?.workspaces.length ?? '—'}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Users / Connections</span>
            <span class="stat-value">{data?.usersTotal ?? 0}<span class="stat-sub">/{data?.connectionsTotal ?? 0}</span></span>
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

        <div class="ws-card flex-no-shrink" data-testid="workspace-search-container">
          <SearchEdit bind:value={search} width={'100%'} />
        </div>

        <div class="ws-card">
          <div class="ws-card-title">Filters</div>
          <div class="ws-filter-grid">
            <label class="ws-filter">
              <CheckBox bind:checked={showActive} />
              <span>Active workspaces</span>
            </label>
            <label class="ws-filter">
              <CheckBox bind:checked={showArchived} />
              <span>Archived workspaces</span>
            </label>
            <label class="ws-filter">
              <CheckBox bind:checked={showDeleted} />
              <span>Deleted workspaces</span>
            </label>
            <label class="ws-filter">
              <CheckBox bind:checked={showOther} />
              <span>Other workspaces</span>
            </label>
            <label class="ws-filter">
              <CheckBox bind:checked={showGrAttempts} />
              <span>Attempts {'>='}0</span>
            </label>
            <label class="ws-filter">
              <CheckBox bind:checked={showSelectedRegionOnly} />
              <span>Selected region only</span>
            </label>
            <label class="ws-filter">
              <CheckBox bind:checked={showInactive} />
              <span>Inactive workspaces</span>
            </label>
          </div>
        </div>

        <div class="ws-card">
          <div class="ws-card-title">Sorting & regions</div>
          <div class="ws-control-row">
            <span class="ws-control-label">Sort order</span>
            <ButtonMenu
              selected={sortingRule}
              autoSelectionIfOne
              title={sortRules[sortingRule]}
              items={Object.entries(sortRules).map((it) => ({ id: it[0], label: getEmbeddedLabel(it[1]) }))}
              on:selected={(it) => {
                sortingRule = it.detail
              }}
            />
          </div>
          <div class="ws-control-row">
            <span class="ws-control-label">Migrate to region</span>
            <ButtonMenu
              selected={selectedRegionId}
              autoSelectionIfOne
              title={selectedRegionName}
              items={regionInfo.map((it) => ({
                id: it.region === '' ? '#' : it.region,
                label: getEmbeddedLabel(it.name.length > 0 ? it.name : it.region + ' (hidden)')
              }))}
              on:selected={(it) => {
                selectedRegionId = it.detail === '#' ? '' : it.detail
              }}
            />
          </div>
          <div class="ws-control-row">
            <span class="ws-control-label">Filter by region</span>
            <CheckBox bind:checked={showSelectedRegionOnly} />
            <ButtonMenu
              selected={filterRegionId}
              autoSelectionIfOne
              title={filteredRegionName}
              items={regionInfo.map((it) => ({
                id: it.region === '' ? '#' : it.region,
                label: getEmbeddedLabel(it.name.length > 0 ? it.name : it.region + ' (hidden)')
              }))}
              on:selected={(it) => {
                filterRegionId = it.detail === '#' ? '' : it.detail
              }}
            />
          </div>
        </div>
        <div class="fs-title p-1">
          <Scroller maxHeight={40} noStretch={true}>
            <div class="mr-4">
              {#each Object.keys(dayRanges) as k}
                {@const v = groupped.get(k) ?? []}
                {@const hasMore = (groupped.get(k) ?? []).length > limit}
                {@const activeV = v
                  .filter((it) => isActiveMode(it.mode) && it.region !== selectedRegionId)
                  .slice(0, limit)}
                {@const activeAll = v.filter((it) => isActiveMode(it.mode))}
                {@const archivedV = v.filter((it) => isArchivingMode(it.mode))}
                {@const deletedV = v.filter((it) => isDeletingMode(it.mode))}
                {@const maintenance = v.length - activeAll.length - archivedV.length - deletedV.length}
                {@const grByRegion = groupByArray(v, (it) => regionTitles[it.region ?? ''])}
                {#if v.length > 0}
                  <Expandable expandable={true} bordered={true} expanded={search.trim().length > 0}>
                    <svelte:fragment slot="title">
                      <span class="fs-title focused-button flex-row-center">
                        {k} -
                        {#if hasMore}
                          {limit} of {v.length}
                        {:else}
                          {v.length}
                        {/if}
                        {#if maintenance > 0}
                          - maitenance: {maintenance}
                        {/if}
                        {#if grByRegion.size > 1}
                          {#each grByRegion.entries() as [k, v]}
                            <div class="p-1">
                              {k ?? ''}: {v.length}
                            </div>
                          {/each}
                        {/if}
                      </span>
                    </svelte:fragment>
                    <svelte:fragment slot="title-tools">
                      {#if hasMore}
                        <div class="ml-4">
                          <Button
                            label={getEmbeddedLabel('More items')}
                            kind={'link'}
                            on:click={() => {
                              limit += 50
                            }}
                          />
                        </div>
                      {/if}
                    </svelte:fragment>
                    <svelte:fragment slot="tools">
                      {#if activeAll.length > 0}
                        <Button
                          icon={IconStop}
                          label={getEmbeddedLabel(`Mass Archive ${activeAll.length}`)}
                          kind={'ghost'}
                          on:click={() => {
                            showPopup(MessageBox, {
                              label: getEmbeddedLabel(`Mass Archive ${activeAll.length}`),
                              message: getEmbeddedLabel(`Please confirm archive ${activeAll.length} workspaces`),
                              action: async () => {
                                void performWorkspaceOperation(
                                  activeAll.map((it) => it.uuid),
                                  'archive'
                                )
                              }
                            })
                          }}
                        />
                      {/if}

                      {#if regionInfo.length > 0 && activeV.length > 0}
                        <Button
                          icon={IconArrowRight}
                          kind={'positive'}
                          label={getEmbeddedLabel(`Mass Migrate ${activeV.length} to ${selectedRegionName ?? ''}`)}
                          on:click={() => {
                            showPopup(MessageBox, {
                              label: getEmbeddedLabel(`Mass Migrate ${activeV.length}`),
                              message: getEmbeddedLabel(`Please confirm migrate ${activeV.length} workspaces`),
                              action: async () => {
                                await performWorkspaceOperation(
                                  activeV.map((it) => it.uuid),
                                  'migrate-to',
                                  selectedRegionId
                                )
                              }
                            })
                          }}
                        />
                      {/if}
                    </svelte:fragment>
                    {#each v.slice(0, limit) as workspace}
                      {@const wsName = workspace.name}
                      {@const lastUsageDays = Math.round((now - (workspace.lastVisit ?? 0)) / (1000 * 3600 * 24))}
                      {@const bIdx = backupIdx.get(workspace.uuid)}
                      {@const stats = statsByWorkspace.get(workspace.uuid ?? '')}
                      <!-- svelte-ignore a11y-click-events-have-key-events -->
                      <!-- svelte-ignore a11y-no-static-element-interactions -->
                      <tr class="flex fs-title cursor-pointer focused-button bordered row-clickable" id={`${workspace.uuid}`} on:click={() => openWorkspace(workspace.uuid)}>
                        <div class="label overflow-label p-1 flex flex-row-center" style:width={'15rem'}>
                          {wsName}
                          {#if stats}
                            -
                            <div class="ml-1">
                              {stats.sessions?.length ?? 0}

                              {(stats.sessions ?? []).reduceRight(
                                (p, it) => p + (it.mins5.tx + it.mins5.find) + (it.current.tx + it.current.find),
                                0
                              )}
                            </div>
                          {/if}
                          <div class="ml-1 flex flex-row-center">
                            <Button
                              icon={IconOpen}
                              size={'small'}
                              on:click={() => select(workspace.url)}
                              showTooltip={{ label: getEmbeddedLabel('Open Workspace URL') }}
                            />
                            <Button
                              icon={IconCopy}
                              size={'small'}
                              on:click={() => copyTextToClipboard(workspace.uuid)}
                              showTooltip={{ label: getEmbeddedLabel('Copy UUID') }}
                            />
                          </div>
                        </div>
                        <div class="label overflow-label p-1 flex flex-row-center" style:width={'5rem'}>
                          {workspace.region ?? ''}
                        </div>
                        <div class="label overflow-label p-1 flex flex-row-center" style:width={'5rem'}>
                          {lastUsageDays} days
                        </div>
                        <div class="label overflow-label p-1 flex flex-row-center" style:width={'10rem'}>
                          {workspace.mode ?? '-'}
                        </div>
                        <div class="label overflow-label flex flex-row-center" style:width={'5rem'}>
                          {workspace.processingAttempts}
                          {#if workspace.processingAttempts > 0}
                            <Button
                              on:click={() => {
                                showPopup(MessageBox, {
                                  label: getEmbeddedLabel(`Reset attempts ${workspace.url}`),
                                  message: getEmbeddedLabel('Please confirm'),
                                  action: async () => {
                                    await performWorkspaceOperation(workspace.uuid, 'reset-attempts')
                                  }
                                })
                              }}
                              icon={IconDownOutline}
                              size={'small'}
                              kind={'ghost'}
                            />
                          {/if}
                        </div>
                        <div class="flex flex-row-center" style:width={'5rem'}>
                          {#if workspace.processingProgress !== 100 && workspace.processingProgress !== 0}
                            ({workspace.processingProgress}%)
                          {/if}
                        </div>
                        <div class="flex flex-row-center" style:width={'15rem'}>
                          {#if workspace.backupInfo != null}
                            {@const sz = Math.max(
                              workspace.backupInfo.backupSize,
                              workspace.backupInfo.dataSize + workspace.backupInfo.blobsSize
                            )}
                            {@const szGb = Math.round((sz * 100) / 1024) / 100}
                            {#if szGb > 0}
                              {Math.round((sz * 100) / 1024) / 100}Gb
                            {:else}
                              {Math.round(sz * 100) / 100}Mb
                            {/if}
                          {/if}
                          {#if bIdx != null}
                            [#{bIdx}]
                          {/if}
                        </div>
                        <div class="flex flex-row-center" style:width={'15rem'}>
                          {#if workspace.backupInfo != null}
                            {@const hours = Math.round((now - workspace.backupInfo.lastBackup) / (1000 * 3600))}

                            {#if hours > 24}
                              {Math.round(hours / 24)} days
                            {:else}
                              {hours} hours
                            {/if}
                          {/if}
                        </div>
                        <div class="flex flex-row-center p-1">
                          {#if workspace.mode === 'active'}
                            <Button
                              icon={IconStop}
                              size={'small'}
                              label={getEmbeddedLabel('Archive')}
                              kind={'ghost'}
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
                          {#if regionInfo.length > 0 && workspace.mode === 'active' && (workspace.region ?? '') !== selectedRegionId}
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
                                    await performWorkspaceOperation(workspace.uuid, 'migrate-to', selectedRegionId)
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
                      </tr>
                    {/each}
                  </Expandable>
                {/if}
              {/each}
            </div>
          </Scroller>
        </div>

      <div class="ws-section-header">
        <h3 class="ws-section-title">Accounts</h3>
        <label class="super-admin-toggle flex-row-center">
          <CheckBox bind:checked={accountSuperAdminMode} />
          <span class="ml-2">Enable deletion</span>
        </label>
      </div>

      <div class="ws-card ws-accounts-toolbar flex-no-shrink">
        <div class="ws-accounts-search">
          <SearchEdit bind:value={accountSearch} width={'100%'} on:change={accountSearchChanged} />
        </div>
        <div class="ws-accounts-pager">
        <Button
          label={getEmbeddedLabel('Previous')}
          disabled={accountSkip === 0}
          on:click={async () => {
            accountSkip = Math.max(0, accountSkip - accountLimit)
            await loadAccounts(accountSearch, accountSkip, accountLimit)
          }}
        />
        <span class="mx-2">Page {Math.floor(accountSkip / accountLimit) + 1}</span>
        <Button
          label={getEmbeddedLabel('Next')}
          disabled={accounts.length < accountLimit}
          on:click={async () => {
            accountSkip += accountLimit
            await loadAccounts(accountSearch, accountSkip, accountLimit)
          }}
        />
        </div>
      </div>

      <div class="ws-accounts-table">
        <div class="ws-accounts-head">
          <div>Account</div>
          <div>Social IDs</div>
          <div>Workspaces</div>
          <div class="ws-accounts-actions-col">Actions</div>
        </div>
        <div class="ws-accounts-body">
          <Scroller maxHeight={40} noStretch={true}>
            {#each accounts as account}
              <div class="ws-account-row">
                <div class="ws-account-cell ws-account-cell-name">
                  <div class="ws-account-name">{account.firstName} {account.lastName}</div>
                  <code class="ws-account-uuid" title={account.uuid}>{account.uuid}</code>
                </div>

                <div class="ws-account-cell">
                  <div class="ws-account-count">{account.socialIds.length} total</div>
                  {#each account.socialIds as socialId}
                    <div class="ws-account-meta" title={socialId.value}>
                      <span class="ws-account-meta-key">{socialId.type}</span>
                      <span class="ws-account-meta-val">{socialId.value}</span>
                    </div>
                  {/each}
                </div>

                <div class="ws-account-cell">
                  <div class="ws-account-count">{account.workspaces.length} total</div>
                  {#each account.workspaces as workspace}
                    <div class="ws-account-meta" title={`${workspace.name} · ${workspace.url} · ${workspace.uuid}`}>
                      <span class="ws-account-meta-key">{workspace.name}</span>
                      <span class="ws-account-meta-val">{workspace.url}</span>
                    </div>
                  {/each}
                </div>

                <div class="ws-account-cell ws-account-cell-actions">
                  {#if accountSuperAdminMode}
                    <Button
                      icon={IconStop}
                      size={'small'}
                      kind={'dangerous'}
                      label={getEmbeddedLabel('Delete')}
                      on:click={() => {
                        showPopup(MessageBox, {
                          label: getEmbeddedLabel(`Delete account ${account.firstName} ${account.lastName}`),
                          message: getEmbeddedLabel('Please confirm account deletion. This action cannot be undone.'),
                          action: async () => {
                            await deleteAccount(account.uuid)
                            await loadAccounts(accountSearch, accountSkip, accountLimit)
                          }
                        })
                      }}
                    />
                  {/if}
                </div>
              </div>
            {/each}
          </Scroller>
        </div>
      </div>
        </div>
      </Scroller>
    </div>
  </div>
</AdminShell>
{#if selectedWorkspaceUuid != null}
  <AdminWorkspaceDrawer workspaceUuid={selectedWorkspaceUuid} on:close={closeWorkspace} />
{/if}
<Popup />
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
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: var(--spacing-2);
  }

  .ws-breakdown,
  .ws-section-header {
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

  .stat-positive {
    color: var(--theme-state-positive-color, #10b981);
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

  .ws-card {
    width: 100%;
    box-sizing: border-box;
    padding: var(--spacing-2);
    background: var(--theme-bg-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--small-BorderRadius);
  }

  .ws-accounts-toolbar {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .ws-accounts-search {
    flex: 1;
  }

  .ws-card-title {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--theme-darker-color);
    margin-bottom: 0.55rem;
  }

  .ws-filter-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.4rem 1.25rem;
  }

  .ws-filter {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    font-size: 0.85rem;
    color: var(--theme-content-color);
    cursor: pointer;
  }

  .ws-control-row {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.25rem 0;
  }

  .ws-control-label {
    flex: 0 0 11rem;
    font-size: 0.82rem;
    color: var(--theme-darker-color);
  }

  .ws-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: var(--spacing-2) 0 0;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--theme-divider-color);
  }

  .ws-section-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 500;
    color: var(--theme-caption-color);
  }

  .ws-accounts-pager {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-shrink: 0;
  }

  .super-admin-toggle {
    display: inline-flex;
    align-items: center;
    font-size: 0.85rem;
    color: var(--theme-content-color);
    cursor: pointer;
  }

  // Restyle the remaining upstream section (workspace list scroller) so it shares the same card look.
  :global(.admin-ws .hulyComponent-content > .fs-title.p-1) {
    background: var(--theme-bg-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--small-BorderRadius);
    padding: var(--spacing-1) !important;
    overflow: hidden;
  }

  /* Accounts table — deterministic grid columns shared by header + every row */
  .ws-accounts-table {
    width: 100%;
    box-sizing: border-box;
    background: var(--theme-bg-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--small-BorderRadius);
    overflow: hidden;
  }

  .ws-accounts-head,
  .ws-account-row {
    display: grid;
    grid-template-columns: minmax(220px, 1.4fr) minmax(260px, 1.6fr) minmax(260px, 1.6fr) 110px;
    align-items: start;
  }

  .ws-accounts-head {
    padding: 0;
    background: var(--theme-bg-accent-color);
    border-bottom: 1px solid var(--theme-divider-color);

    & > div {
      padding: 0.55rem 0.85rem;
      font-size: 0.72rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--theme-darker-color);
    }

    .ws-accounts-actions-col {
      justify-self: end;
      text-align: right;
    }
  }

  .ws-accounts-body {
    min-height: 0;
  }

  .ws-account-row {
    border-bottom: 1px solid var(--theme-divider-color);

    &:last-child {
      border-bottom: 0;
    }
  }

  .ws-account-cell {
    padding: 0.65rem 0.85rem;
    font-size: 0.82rem;
    color: var(--theme-content-color);
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .ws-account-cell-actions {
    justify-self: end;
    align-self: center;
    flex-direction: row;
    gap: 0.3rem;
  }

  .ws-account-name {
    color: var(--theme-caption-color);
    font-weight: 500;
    font-size: 0.875rem;
  }

  .ws-account-uuid {
    font-family: var(--mono-font, 'SF Mono', 'Menlo', 'Consolas', monospace);
    font-size: 0.7rem;
    color: var(--theme-darker-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
  }

  .ws-account-count {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--theme-darker-color);
  }

  .ws-account-meta {
    display: flex;
    gap: 0.4rem;
    min-width: 0;
    align-items: baseline;
  }

  .ws-account-meta-key {
    flex-shrink: 0;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--theme-darker-color);
    padding: 0.05rem 0.35rem;
    background: var(--theme-bg-accent-color);
    border-radius: 0.2rem;
    line-height: 1.4;
  }

  .row-clickable {
    cursor: pointer;
  }

  .ws-account-meta-val {
    font-family: var(--mono-font, 'SF Mono', 'Menlo', 'Consolas', monospace);
    font-size: 0.75rem;
    color: var(--theme-content-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
</style>
