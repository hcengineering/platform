<script lang="ts">
  import {
    groupByArray,
    isActiveMode,
    isArchivingMode,
    isDeletingMode,
    isMigrationMode,
    isRestoringMode,
    reduceCalls,
    type BaseWorkspaceInfo
  } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { isAdminUser, MessageBox } from '@hcengineering/presentation'
  import {
    Button,
    ButtonMenu,
    CheckBox,
    Expandable,
    IconArrowRight,
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
  import { getAllWorkspaces, getRegionInfo, performWorkspaceOperation, type RegionInfo } from '../utils'

  $: now = $ticker

  $: isAdmin = isAdminUser()

  let search: string = ''

  async function select (workspace: string): Promise<void> {
    const url = locationToUrl({ path: [workbenchId, workspace] })
    window.open(url, '_blank')
  }

  type WorkspaceInfo = BaseWorkspaceInfo & { attempts: number }

  let workspaces: WorkspaceInfo[] = []

  enum SortingRule {
    Name = '1',
    BackupDate = '2',
    BackupSize = '3',
    LastVisit = '4'
  }

  let sortingRule = SortingRule.BackupDate

  const sortRules = {
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

  $: sortedWorkspaces = workspaces
    .filter(
      (it) =>
        ((it.workspaceName?.includes(search) ?? false) ||
          (it.workspaceUrl?.includes(search) ?? false) ||
          it.workspace?.includes(search) ||
          it.createdBy?.includes(search)) &&
        ((showActive && isActiveMode(it.mode)) ||
          (showArchived && isArchivingMode(it.mode)) ||
          (showDeleted && isDeletingMode(it.mode)) ||
          (showOther && (isMigrationMode(it.mode) || isRestoringMode(it.mode))))
    )
    .sort((a, b) => {
      switch (sortingRule) {
        case SortingRule.BackupDate: {
          return (a.backupInfo?.lastBackup ?? 0) - (b.backupInfo?.lastBackup ?? 0)
        }
        case SortingRule.BackupSize:
          return (b.backupInfo?.backupSize ?? 0) - (a.backupInfo?.backupSize ?? 0)
        case SortingRule.LastVisit:
          return (b.lastVisit ?? 0) - (a.lastVisit ?? 0)
      }
      return (b.workspaceUrl ?? b.workspace).localeCompare(a.workspaceUrl ?? a.workspace)
    })

  let backupIdx = new Map<string, number>()

  const backupInterval: number = 43200

  let backupable: WorkspaceInfo[] = []

  $: {
    // Assign backup idx
    const backupSorting = [...sortedWorkspaces].filter((it) => {
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
      newBackupIdx.set(it.workspace, idx)
    }
    backupIdx = newBackupIdx
  }

  const dayRanges = {
    Today: 1,
    'Tree Days': 3,
    Week: 7,
    Month: 30,
    'Two Months': 60,
    'Tree Months': 90,
    'Six Month': 182,
    'Nine Months': 270,
    Year: 365,
    FewOrMoreYears: 10000000
  }

  let limit = 50

  // Individual filters

  let showActive: boolean = true
  let showArchived: boolean = false
  let showDeleted: boolean = false
  let showOther: boolean = true

  $: groupped = groupByArray(sortedWorkspaces, (it) => {
    const lastUsageDays = Math.round((now - it.lastVisit) / (1000 * 3600 * 24))
    return Object.entries(dayRanges).find(([_k, v]) => lastUsageDays <= v)?.[0] ?? 'Other'
  })

  let regionInfo: RegionInfo[] = []

  let selectedRegionId: string = ''
  void getRegionInfo().then((_regionInfo) => {
    regionInfo = _regionInfo?.filter((it) => it.name !== '') ?? []
    if (selectedRegionId === '' && regionInfo.length > 0) {
      selectedRegionId = regionInfo[0].region
    }
  })

  $: selectedRegionName = regionInfo.find((it) => it.region === selectedRegionId)?.name
</script>

{#if isAdmin}
  <div class="anticrm-panel flex-row flex-grow p-5">
    <div class="fs-title p-3">Workspaces administration panel</div>
    <div class="fs-title p-3">
      Workspaces: {workspaces.length} active: {workspaces.filter((it) => isActiveMode(it.mode)).length}

      Backupable: {backupable.length} new: {backupable.reduce((p, it) => p + (it.backupInfo == null ? 1 : 0), 0)}
    </div>
    <div class="fs-title p-3 flex-no-shrink">
      <SearchEdit bind:value={search} width={'100%'} />
    </div>

    <div class="p-3 flex-col">
      <span class="fs-title mr-2">Filters: </span>
      <div class="flex-row-center">
        Show active workspaces:
        <CheckBox bind:checked={showActive} />
      </div>
      <div class="flex-row-center">
        <span class="mr-2">Show archived workspaces:</span>
        <CheckBox bind:checked={showArchived} />
      </div>
      <div class="flex-row-center">
        <span class="mr-2">Show deleted workspaces:</span>
        <CheckBox bind:checked={showDeleted} />
      </div>
      <div class="flex-row-center">
        <span class="mr-2">Show other workspaces:</span>
        <CheckBox bind:checked={showOther} />
      </div>
    </div>

    <div class="fs-title p-3 flex-row-center">
      <span class="mr-2"> Sorting order: {sortingRule} </span>
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

    <div class="fs-title p-3 flex-row-center">
      <span class="mr-2"> Migration region selector: </span>
      <ButtonMenu
        selected={selectedRegionId}
        autoSelectionIfOne
        title={regionInfo.find((it) => it.region === selectedRegionId)?.name}
        items={regionInfo.map((it) => ({ id: it.region === '' ? '#' : it.region, label: getEmbeddedLabel(it.name) }))}
        on:selected={(it) => {
          selectedRegionId = it.detail === '#' ? '' : it.detail
        }}
      />
    </div>
    <div class="fs-title p-1">
      <Scroller maxHeight={40} noStretch={true}>
        <div class="mr-4">
          {#each Object.keys(dayRanges) as k}
            {@const v = groupped.get(k) ?? []}
            {@const hasMore = (groupped.get(k) ?? []).length > limit}
            {@const activeV = v.filter((it) => it.mode === 'active' && (it.region ?? '') !== selectedRegionId)}
            {@const archiveV = v.filter((it) => it.mode === 'active')}
            {@const archivedD = v.filter((it) => it.mode === 'archived')}
            {@const av = v.length - archiveV.length - archivedD.length}
            {#if v.length > 0}
              <Expandable expandable={true} bordered={true}>
                <svelte:fragment slot="title">
                  <span class="fs-title focused-button flex-row-center">
                    {k} -
                    {#if hasMore}
                      {limit} of {v.length}
                    {:else}
                      {v.length}
                    {/if}
                    {#if av > 0}
                      - maitenance: {av}
                    {/if}
                  </span>
                </svelte:fragment>
                <svelte:fragment slot="title-tools">
                  {#if hasMore}
                    <div class="ml-4">
                      <Button
                        label={getEmbeddedLabel(`More ${k}`)}
                        kind={'link'}
                        on:click={() => {
                          limit += 50
                        }}
                      />
                    </div>
                  {/if}
                </svelte:fragment>
                <svelte:fragment slot="tools">
                  {#if archiveV.length > 0}
                    <Button
                      icon={IconStop}
                      label={getEmbeddedLabel(`Mass Archive ${archiveV.length}`)}
                      kind={'ghost'}
                      on:click={() => {
                        showPopup(MessageBox, {
                          label: getEmbeddedLabel(`Mass Archive ${archiveV.length}`),
                          message: getEmbeddedLabel(`Please confirm archive ${archiveV.length} workspaces`),
                          action: async () => {
                            void performWorkspaceOperation(
                              archiveV.map((it) => it.workspace),
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
                          label: getEmbeddedLabel(`Mass Migrate ${archiveV.length}`),
                          message: getEmbeddedLabel(`Please confirm migrate ${archiveV.length} workspaces`),
                          action: async () => {
                            await performWorkspaceOperation(
                              activeV.map((it) => it.workspace),
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
                  {@const wsName = workspace.workspaceName ?? workspace.workspace}
                  {@const lastUsageDays = Math.round((now - workspace.lastVisit) / (1000 * 3600 * 24))}
                  {@const bIdx = backupIdx.get(workspace.workspace)}
                  <!-- svelte-ignore a11y-click-events-have-key-events -->
                  <!-- svelte-ignore a11y-no-static-element-interactions -->
                  <div class="flex fs-title cursor-pointer focused-button bordered">
                    <div class="flex p-2">
                      <span class="label overflow-label flex-row-center" style:width={'12rem'}>
                        {wsName}
                        <div class="ml-1">
                          <Button
                            icon={IconOpen}
                            size={'small'}
                            on:click={() => select(workspace.workspaceUrl ?? workspace.workspace)}
                          />
                        </div>
                      </span>
                      <div class="ml-1" style:width={'12rem'}>
                        {workspace.createdBy}
                      </div>
                      <span class="label overflow-label" style:width={'8rem'}>
                        {workspace.region ?? ''}
                      </span>
                      <span class="label overflow-label" style:width={'5rem'}>
                        {lastUsageDays} days
                      </span>

                      <span class="label overflow-label" style:width={'10rem'}>
                        {workspace.mode ?? '-'}
                      </span>

                      <span class="label overflow-label" style:width={'2rem'}>
                        {workspace.attempts}
                      </span>

                      <!-- <span class="flex flex-between select-text overflow-label" style:width={'25rem'}>
                  {workspace.workspace}
                </span> -->
                      <span class="flex flex-between" style:width={'5rem'}>
                        {#if workspace.progress !== 100 && workspace.progress !== 0}
                          ({workspace.progress}%)
                        {/if}
                      </span>
                      <span class="flex flex-between" style:width={'5rem'}>
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
                      </span>
                      <span class="flex flex-between" style:width={'5rem'}>
                        {#if workspace.backupInfo != null}
                          {@const hours = Math.round((now - workspace.backupInfo.lastBackup) / (1000 * 3600))}

                          {#if hours > 24}
                            {Math.round(hours / 24)} days
                          {:else}
                            {hours} hours
                          {/if}
                        {/if}
                      </span>
                    </div>
                    <div class="flex flex-grow gap-1-5 flex-between">
                      <div class="flex flex-row-center gap-1-5">
                        {#if workspace.mode === 'active'}
                          <Button
                            icon={IconStop}
                            size={'small'}
                            label={getEmbeddedLabel('Archive')}
                            kind={'ghost'}
                            on:click={() => {
                              showPopup(MessageBox, {
                                label: getEmbeddedLabel(`Archive ${workspace.workspaceUrl}`),
                                message: getEmbeddedLabel('Please confirm'),
                                action: async () => {
                                  await performWorkspaceOperation(workspace.workspace, 'archive')
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
                                label: getEmbeddedLabel(`Unarchive ${workspace.workspaceUrl}`),
                                message: getEmbeddedLabel('Please confirm'),
                                action: async () => {
                                  await performWorkspaceOperation(workspace.workspace, 'unarchive')
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
                            label={getEmbeddedLabel('Migrate ' + (selectedRegionName ?? ''))}
                            on:click={() => {
                              showPopup(MessageBox, {
                                label: getEmbeddedLabel(`Migrate ${workspace.workspaceUrl}`),
                                message: getEmbeddedLabel('Please confirm'),
                                action: async () => {
                                  await performWorkspaceOperation(workspace.workspace, 'migrate-to', selectedRegionId)
                                }
                              })
                            }}
                          />
                        {/if}
                      </div>
                    </div>
                  </div>
                {/each}
              </Expandable>
            {/if}
          {/each}
        </div>
      </Scroller>
    </div>
  </div>
  <Popup />
{/if}
