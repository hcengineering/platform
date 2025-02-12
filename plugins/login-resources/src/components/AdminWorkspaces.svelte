<script lang="ts">
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
    ticker,
    Grid
  } from '@hcengineering/ui'
  import { workbenchId } from '@hcengineering/workbench'
  import { getAllWorkspaces, getRegionInfo, performWorkspaceOperation } from '../utils'
  import { RegionInfo } from '@hcengineering/account-client'
  import ColStar from '@hcengineering/ui/src/components/icons/ColStar.svelte'

  $: now = $ticker

  $: isAdmin = isAdminUser()

  let search: string = ''

  async function select (workspace: string): Promise<void> {
    const url = locationToUrl({ path: [workbenchId, workspace] })
    window.open(url, '_blank')
  }

  type WorkspaceInfo = WorkspaceInfoWithStatus & { processingAttempts: number }

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
        ((it.name?.includes(search) ?? false) ||
          (it.url?.includes(search) ?? false) ||
          it.uuid?.includes(search) ||
          it.createdBy?.includes(search)) &&
        ((showActive && isActiveMode(it.mode)) ||
          (showArchived && isArchivingMode(it.mode)) ||
          (showDeleted && isDeletingMode(it.mode)) ||
          (showOther && (isMigrationMode(it.mode) || isRestoringMode(it.mode) || isUpgradingMode(it.mode))))
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
      return (b.url ?? b.uuid).localeCompare(a.url ?? a.uuid)
    })

  let backupIdx = new Map<string, number>()

  const backupInterval: number = 43200

  let backupable: WorkspaceInfo[] = []

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
    const lastUsageDays = Math.round((now - (it.lastVisit ?? 0)) / (1000 * 3600 * 24))
    return Object.entries(dayRanges).find(([_k, v]) => lastUsageDays <= v)?.[0] ?? 'Other'
  })

  let regionInfo: RegionInfo[] = []

  let selectedRegionId: string = ''
  void getRegionInfo().then((_regionInfo) => {
    regionInfo = _regionInfo ?? []
    if (selectedRegionId === '' && regionInfo.length > 0) {
      selectedRegionId = regionInfo[0].region
    }
  })

  $: selectedRegionRef = regionInfo.find((it) => it.region === selectedRegionId)
  $: selectedRegionName =
    selectedRegionRef !== undefined
      ? selectedRegionRef.name.length > 0
        ? selectedRegionRef.name
        : selectedRegionRef.region
      : ''

  $: byVersion = groupByArray(
    workspaces.filter((it) => {
      const lastUsed = Math.round((now - (it.lastVisit ?? 0)) / (1000 * 3600 * 24))
      return isActiveMode(it.mode) && lastUsed < 1
    }),
    (it) => versionToString({ major: it.versionMajor, minor: it.versionMinor, patch: it.versionPatch })
  )

  let superAdminMode = false
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
{#if isAdmin}
  <div class="anticrm-panel flex-row flex-grow p-5" style:overflow-y={'auto'}>
    <div class="flex-between">
      <div class="fs-title p-3">Workspaces administration panel</div>
      <div>
        <CheckBox bind:checked={superAdminMode} />
      </div>
    </div>
    <div class="fs-title p-3">
      Workspaces: {workspaces.length} active: {workspaces.filter((it) => isActiveMode(it.mode)).length}

      upgrading: {workspaces.filter((it) => isUpgradingMode(it.mode)).length}

      Backupable: {backupable.length} new: {backupable.reduce((p, it) => p + (it.backupInfo == null ? 1 : 0), 0)}

      <div class="flex-row-center">
        {#each byVersion.entries() as [k, v]}
          <div class="p-1">
            {k}: {v.length}
          </div>
        {/each}
      </div>
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
    <div class="fs-title p-1">
      <Scroller maxHeight={40} noStretch={true}>
        <div class="mr-4">
          {#each Object.keys(dayRanges) as k}
            {@const v = groupped.get(k) ?? []}
            {@const hasMore = (groupped.get(k) ?? []).length > limit}
            {@const activeV = v.filter((it) => isActiveMode(it.mode) && it.region !== selectedRegionId)}
            {@const activeAll = v.filter((it) => isActiveMode(it.mode))}
            {@const archivedV = v.filter((it) => isArchivingMode(it.mode))}
            {@const deletedV = v.filter((it) => isDeletingMode(it.mode))}
            {@const maintenance = v.length - activeAll.length - archivedV.length - deletedV.length}
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
                  <!-- svelte-ignore a11y-click-events-have-key-events -->
                  <!-- svelte-ignore a11y-no-static-element-interactions -->
                  <div class="flex fs-title cursor-pointer focused-button bordered" id={`${workspace.uuid}`}>
                    <Grid column={10} equalHeight={false} columnGap={0}>
                      <span class="label overflow-label flex-row-center flex-grow flex-shrink">
                        {wsName}
                        <div class="ml-1">
                          <Button icon={IconOpen} size={'small'} on:click={() => select(workspace.url)} />
                        </div>
                      </span>
                      <div class="ml-1">
                        <!-- Retrieve created by-->
                        <!-- {workspace.createdBy} -->
                      </div>
                      <span class="label overflow-label flex-shrink p-1">
                        {workspace.region ?? ''}
                      </span>
                      <span class="label overflow-label flex-shrink p-1">
                        {lastUsageDays} days
                      </span>
                      <span class="label overflow-label p-1">
                        {workspace.mode ?? '-'}
                      </span>
                      <span class="label overflow-label flex-shrink">
                        {workspace.processingAttempts}
                      </span>
                      <span class="flex flex-shrink">
                        {#if workspace.processingProgress !== 100 && workspace.processingProgress !== 0}
                          ({workspace.processingProgress}%)
                        {/if}
                      </span>
                      <span class="flex flex-shrink">
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
                      <span class="flex flex-shrink">
                        {#if workspace.backupInfo != null}
                          {@const hours = Math.round((now - workspace.backupInfo.lastBackup) / (1000 * 3600))}

                          {#if hours > 24}
                            {Math.round(hours / 24)} days
                          {:else}
                            {hours} hours
                          {/if}
                        {/if}
                      </span>
                      <div class="flex flex-grow gap-1-5 flex-shrink">
                        <div class="flex flex-row-center gap-1-5">
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
                      </div>
                    </Grid>
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
