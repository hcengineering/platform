<script lang="ts">
  import { groupByArray, type BaseWorkspaceInfo } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { isAdminUser } from '@hcengineering/presentation'
  import {
    Button,
    ButtonMenu,
    Expandable,
    IconArrowRight,
    IconOpen,
    IconStart,
    IconStop,
    locationToUrl,
    Popup,
    Scroller,
    SearchEdit,
    ticker
  } from '@hcengineering/ui'
  import { workbenchId } from '@hcengineering/workbench'
  import { getAllWorkspaces, getRegionInfo, performWorkspaceOperation, type RegionInfo } from '../utils'

  $: isAdmin = isAdminUser()

  let search: string = ''

  async function select (workspace: string): Promise<void> {
    const url = locationToUrl({ path: [workbenchId, workspace] })
    window.open(url, '_blank')
  }

  type WorkspaceInfo = BaseWorkspaceInfo & { attempts: number }

  let workspaces: WorkspaceInfo[] = []

  $: if ($ticker > 0) {
    void getAllWorkspaces().then((res) => {
      workspaces = res.sort((a, b) =>
        (b.workspaceUrl ?? b.workspace).localeCompare(a.workspaceUrl ?? a.workspace)
      ) as WorkspaceInfo[]
    })
  }

  const now = Date.now()

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

  $: groupped = groupByArray(
    workspaces.filter(
      (it) =>
        (it.workspaceName?.includes(search) ?? false) ||
        (it.workspaceUrl?.includes(search) ?? false) ||
        it.workspace?.includes(search)
    ),
    (it) => {
      const lastUsageDays = Math.round((now - it.lastVisit) / (1000 * 3600 * 24))
      return Object.entries(dayRanges).find(([_k, v]) => lastUsageDays <= v)?.[0] ?? 'Other'
    }
  )

  let regionInfo: RegionInfo[] = []

  let selectedRegionId: string = ''
  void getRegionInfo().then((_regionInfo) => {
    regionInfo = _regionInfo ?? []
    if (selectedRegionId === '' && regionInfo.length > 0) {
      selectedRegionId = regionInfo[0].region
    }
  })

  $: selectedRegionName = regionInfo.find((it) => it.region === selectedRegionId)?.name
</script>

{#if isAdmin}
  <div class="anticrm-panel flex-row flex-grow p-5">
    <div class="fs-title p-3">Workspaces administration panel</div>
    <div class="fs-title p-3 flex-no-shrink">
      <SearchEdit bind:value={search} width={'100%'} />
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
            {@const activeV = v.filter((it) => it.mode === 'active' && (it.region ?? '') !== selectedRegionId)}
            {@const archiveV = v.filter((it) => it.mode === 'active')}
            {@const archivedD = v.filter((it) => it.mode === 'archived')}
            {@const av = v.length - archiveV.length - archivedD.length}
            {#if v.length > 0}
              <Expandable expandable={true} bordered={true}>
                <svelte:fragment slot="title">
                  <span class="fs-title focused-button">
                    {k} - {v.length}
                    {#if av > 0}
                      - maitenance: {av}
                    {/if}
                  </span>
                </svelte:fragment>
                <svelte:fragment slot="tools">
                  {#if archiveV.length > 0}
                    <Button
                      icon={IconStop}
                      label={getEmbeddedLabel(`Mass Archive ${archiveV.length}`)}
                      kind={'ghost'}
                      on:click={() => {
                        void performWorkspaceOperation(
                          archiveV.map((it) => it.workspace),
                          'archive'
                        )
                      }}
                    />
                  {/if}

                  {#if regionInfo.length > 0 && activeV.length > 0}
                    <Button
                      icon={IconArrowRight}
                      kind={'positive'}
                      label={getEmbeddedLabel(`Mass Migrate ${activeV.length} to ${selectedRegionName ?? ''}`)}
                      on:click={() => {
                        void performWorkspaceOperation(
                          activeV.map((it) => it.workspace),
                          'migrate-to',
                          selectedRegionId
                        )
                      }}
                    />
                  {/if}
                </svelte:fragment>
                {#each v as workspace}
                  {@const wsName = workspace.workspaceName ?? workspace.workspace}
                  {@const lastUsageDays = Math.round((Date.now() - workspace.lastVisit) / (1000 * 3600 * 24))}
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
                      <span class="label overflow-label" style:width={'8rem'}>
                        {workspace.region ?? ''}
                      </span>
                      <span class="label overflow-label" style:width={'5rem'}>
                        {lastUsageDays} days
                      </span>

                      <span class="label overflow-label" style:width={'10rem'}>
                        {workspace.mode}
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
                          {@const sz = workspace.backupInfo.dataSize + workspace.backupInfo.blobsSize}
                          {@const szGb = Math.round((sz * 100) / 1024) / 100}
                          {#if szGb > 0}
                            {Math.round((sz * 100) / 1024) / 100}Gb
                          {:else}
                            {Math.round(sz * 100) / 100}Mb
                          {/if}
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
                              void performWorkspaceOperation(workspace.workspace, 'archive')
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
                              void performWorkspaceOperation(workspace.workspace, 'unarchive')
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
                              void performWorkspaceOperation(workspace.workspace, 'migrate-to', selectedRegionId)
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
