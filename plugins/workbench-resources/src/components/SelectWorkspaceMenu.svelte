<!--
// Copyright © 2022 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import contact from '@hcengineering/contact'
  import { isArchivingMode, WorkspaceInfoWithStatus } from '@hcengineering/core'
  import login from '@hcengineering/login'
  import { getMetadata, getResource } from '@hcengineering/platform'
  import presentation, { decodeTokenPayload, isAdminUser } from '@hcengineering/presentation'
  import {
    Icon,
    IconCheck,
    Label,
    Loading,
    Location,
    SearchEdit,
    closePopup,
    fetchMetadataLocalStorage,
    getCurrentLocation,
    locationStorageKeyId,
    locationToUrl,
    navigate,
    resolvedLocationStore,
    ticker
  } from '@hcengineering/ui'
  import { workbenchId } from '@hcengineering/workbench'
  import { onDestroy, onMount } from 'svelte'

  import { workspacesStore } from '../utils'
  // import Drag from './icons/Drag.svelte'

  onMount(() => {
    void getResource(login.function.GetWorkspaces).then(async (f) => {
      $workspacesStore = await f()
    })
  })

  function getWorkspaceLink (ws: WorkspaceInfoWithStatus): string {
    const loc: Location = {
      path: [workbenchId, ws.url]
    }
    return locationToUrl(loc)
  }

  async function clickHandler (e: MouseEvent, wsUrl: string): Promise<void> {
    if (!e.metaKey && !e.ctrlKey) {
      e.preventDefault()
      closePopup()
      closePopup()
      if (wsUrl !== getCurrentLocation().path[1]) {
        const last = localStorage.getItem(`${locationStorageKeyId}_${wsUrl}`)
        if (last !== null) {
          navigate(JSON.parse(last))
        } else navigate({ path: [workbenchId, wsUrl] })
      }
    }
  }

  let activeElement: HTMLElement
  const btns: HTMLElement[] = []

  function focusTarget (target: HTMLElement): void {
    activeElement = target
  }

  const keyDown = (ev: KeyboardEvent): void => {
    if (ev.key === 'Tab') {
      ev.preventDefault()
      ev.stopPropagation()
    }
    const n = btns.indexOf(activeElement) ?? 0
    if (ev.key === 'ArrowDown') {
      if (n < btns.length - 1) {
        activeElement = btns[n + 1]
      }
      ev.preventDefault()
      ev.stopPropagation()
    }
    if (ev.key === 'ArrowUp') {
      if (n > 0) {
        activeElement = btns[n - 1]
      }
      ev.preventDefault()
      ev.stopPropagation()
    }
  }

  $: isAdmin = isAdminUser()

  let search: string = ''

  const _endpoint: string = fetchMetadataLocalStorage(login.metadata.LoginEndpoint) ?? ''
  const token: string = getMetadata(presentation.metadata.Token) ?? ''

  let endpoint = _endpoint.replace(/^ws/g, 'http')
  if (endpoint.endsWith('/')) {
    endpoint = endpoint.substring(0, endpoint.length - 1)
  }

  let data: any
  onDestroy(
    ticker.subscribe(() => {
      void fetch(endpoint + `/api/v1/statistics?token=${token}`, {})
        .then(async (json) => {
          data = await json.json()
        })
        .catch((err) => {
          console.error(err)
        })
    })
  )

  $: activeSessions =
    (data?.statistics?.activeSessions as Record<
    string,
    Array<{
      userId: string
      data?: Record<string, any>
    }>
    >) ?? {}
</script>

{#if $workspacesStore.length}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="antiPopup" on:keydown={keyDown}>
    <div class="ap-space x2" />
    {#if isAdmin}
      <div class="p-2 ml-2 mr-2 mb-2 flex-grow flex-row-center">
        <SearchEdit bind:value={search} width={'100%'} />
        {#if isAdminUser()}
          <div class="p-1">
            {#if $workspacesStore.length > 500}
              500 /
            {/if}
            {$workspacesStore.length}
          </div>
        {/if}
      </div>
      <div class="p-2 ml-2 mb-4 select-text flex-col bordered">
        {decodeTokenPayload(getMetadata(presentation.metadata.Token) ?? '').workspace}
      </div>
    {/if}
    <div class="ap-scroll">
      <div class="ap-box">
        {#each $workspacesStore
          .filter((it) => search === '' || (it.name?.includes(search) ?? false) || it.url.includes(search))
          .slice(0, 500) as ws, i}
          {@const wsName = ws.name ?? ws.url}
          {@const _activeSession = activeSessions[ws.uuid]}
          {@const lastUsageDays = Math.round((Date.now() - ws.lastVisit) / (1000 * 3600 * 24))}
          <a
            class="stealth"
            href={getWorkspaceLink(ws)}
            on:click={async (e) => {
              await clickHandler(e, ws.url)
            }}
          >
            <button
              bind:this={btns[i]}
              class="ap-menuItem flex-row-center flex-grow"
              class:active={isAdmin && (_activeSession?.length ?? 0) > 0}
              class:hover={btns[i] === activeElement}
              on:mousemove={() => {
                focusTarget(btns[i])
              }}
            >
              <!-- <div class="drag"><Drag size={'small'} /></div> -->
              <!-- <div class="logo empty" /> -->
              <!-- <div class="flex-col flex-grow"> -->
              <div class="flex-col flex-grow">
                <span class="label overflow-label flex flex-grow flex-between">
                  {wsName}
                  {#if isArchivingMode(ws.mode)}
                    - <Label label={presentation.string.Archived} />
                  {/if}
                  {#if ws.region != null && ws.region !== ''}
                    - ({ws.region})
                  {/if}
                  {#if isAdmin && ws.lastVisit != null && ws.lastVisit !== 0}
                    <div class="text-sm">
                      {#if ws.backupInfo != null}
                        {@const sz = Math.max(
                          ws.backupInfo.backupSize,
                          ws.backupInfo.dataSize + ws.backupInfo.blobsSize
                        )}
                        {@const szGb = Math.round((sz * 100) / 1024) / 100}
                        {#if szGb > 0}
                          {Math.round((sz * 100) / 1024) / 100}Gb -
                        {:else}
                          {Math.round(sz)}Mb -
                        {/if}
                      {/if}
                      ({lastUsageDays} days)
                    </div>
                  {/if}
                </span>
                {#if isAdmin && wsName !== ws.url}
                  <span class="text-xs">
                    ({ws.url})
                  </span>
                {/if}
                {#if isAdmin && (_activeSession?.length ?? 0) > 0}
                  <span class="text-xs flex-row-center">
                    <div class="mr-1">
                      <Icon icon={contact.icon.Person} size={'x-small'} />
                    </div>
                    {_activeSession?.length ?? 0}
                  </span>
                {/if}
              </div>
              <!-- <span class="description overflow-label">Description</span> -->
              <!-- </div> -->
              <div class="ap-check">
                {#if $resolvedLocationStore.path[1] === ws.url}
                  <IconCheck size={'small'} />
                {/if}
              </div>
            </button>
          </a>
        {/each}
      </div>
    </div>
    <div class="ap-space x2" />
  </div>
{:else}
  <div class="antiPopup"><Loading /></div>
{/if}

<style lang="scss">
  .active {
    background-color: var(--theme-inbox-people-counter-bgcolor);
  }
</style>
