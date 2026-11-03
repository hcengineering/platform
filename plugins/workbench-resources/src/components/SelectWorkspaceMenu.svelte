<!--
// Copyright © 2022 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
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
  import { isArchivingMode, systemAccountUuid, WorkspaceInfoWithStatus } from '@hcengineering/core'
  import login from '@hcengineering/login'
  import { getMetadata, getResource } from '@hcengineering/platform'
  import presentation, {
    createQuery,
    decodeTokenPayload,
    getFileUrl,
    getWorkspaceAvatarUrl,
    hasResource,
    isAdminUser,
    withBlobVersion,
    workspaceLogoBlobId
  } from '@hcengineering/presentation'
  import setting, { type WorkspaceSetting } from '@hcengineering/setting'
  import {
    closePopup,
    Component,
    fetchMetadataLocalStorage,
    getCurrentLocation,
    getWorkspaceLastVisitDays,
    matchWorkspaceSearch,
    WORKSPACE_SEARCH_THRESHOLD,
    Icon,
    IconCheck,
    isSameSegments,
    Label,
    Loading,
    Location,
    locationStorageKeyId,
    locationToUrl,
    navigate,
    resolvedLocationStore,
    SearchEdit,
    ticker,
    WorkspaceAvatar
  } from '@hcengineering/ui'
  import { workbenchId } from '@hcengineering/workbench'
  import { afterUpdate, onDestroy, onMount } from 'svelte'

  import { Analytics } from '@hcengineering/analytics'
  import type { PersonRating } from '@hcengineering/rating'
  import ratingPlugin from '@hcengineering/rating'
  import workbench from '../plugin'
  import { workspacesStore } from '../utils'
  // import Drag from './icons/Drag.svelte'

  type LoadState = 'pending' | 'loaded' | 'error'
  let loadState: LoadState = 'pending'

  onMount(() => {
    void getResource(login.function.GetWorkspaces)
      .then(async (f) => {
        $workspacesStore = await f()
        loadState = 'loaded'
      })
      .catch((err: any) => {
        loadState = 'error'
        Analytics.handleError(err)
      })
  })

  const levelQuery = createQuery()

  let sysRating: PersonRating | undefined

  levelQuery.query(ratingPlugin.class.PersonRating, { accountId: systemAccountUuid }, (res) => {
    sysRating = res[0]
  })

  const hasRating = hasResource(ratingPlugin.component.RatingRing)

  // The current workspace's logo URL is versioned by modifiedOn, so a change shows up at once
  // instead of after the preview cache window; other workspaces rely on revalidation.
  const wsSettingQuery = createQuery()
  let currentWsSetting: WorkspaceSetting | undefined
  wsSettingQuery.query(setting.class.WorkspaceSetting, { _id: setting.ids.WorkspaceSetting }, (res) => {
    currentWsSetting = res[0]
  })

  // `_setting` is passed only so the markup re-evaluates when the setting changes.
  function getAvatarUrl (
    ws: WorkspaceInfoWithStatus,
    isCurrentWs: boolean,
    _setting: WorkspaceSetting | undefined
  ): string | undefined {
    if (!isCurrentWs) return getWorkspaceAvatarUrl(ws.uuid)
    const icon = currentWsSetting?.icon
    if (icon == null) return undefined
    // A legacy icon (not yet backfilled to `logo`) is only reachable by its own blob id.
    const url = icon === workspaceLogoBlobId ? getWorkspaceAvatarUrl(ws.uuid) : getFileUrl(icon)
    return withBlobVersion(url, currentWsSetting?.modifiedOn)
  }

  // Only show the "there's more below" fade when the list is actually
  // scrolled somewhere above the bottom — not when everything fits, and not
  // once the user has scrolled all the way down.
  let scrollEl: HTMLElement | undefined
  let canScrollMore = false

  function updateScrollFade (): void {
    if (scrollEl == null) return
    canScrollMore = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight > 1
  }

  afterUpdate(() => {
    updateScrollFade()
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
      const current = getCurrentLocation()
      if (wsUrl !== current.path[1]) {
        let last: Location | undefined
        try {
          last = JSON.parse(localStorage.getItem(`${locationStorageKeyId}_${wsUrl}`) ?? '')
        } catch (err: any) {
          // Ignore
        }
        if (last != null && isSameSegments(last, current, 2)) {
          navigate(last)
        } else {
          navigate({ path: [workbenchId, wsUrl] })
        }
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
  // Show the search box for everyone once the list is long enough to need
  // it (same threshold as the login page), always show it for admins.
  // While loading, the count isn't known yet, so treat it like "few
  // workspaces" (hidden) unless admin — it only pops in once loaded if the
  // list actually turns out to be long, rather than flashing on then off.
  $: showSearch = isAdmin || $workspacesStore.length > WORKSPACE_SEARCH_THRESHOLD

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
        .catch((err: any) => {
          Analytics.handleError(err)
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

  $: currentWsUrl = $resolvedLocationStore.path[1]

  // The currently open workspace is always shown first, regardless of its
  // position in the last-visit sort order.
  $: sortedWorkspaces = (() => {
    const filtered = $workspacesStore.filter((it) => matchWorkspaceSearch(it, search))
    const current = filtered.filter((it) => it.url === currentWsUrl)
    const rest = filtered.filter((it) => it.url !== currentWsUrl)
    return [...current, ...rest].slice(0, 500)
  })()
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="antiPopup ws-switcher" on:keydown={keyDown}>
  <div class="ap-space x2" />

  <div class="p-2 ml-2 mr-2 mb-2 flex-grow flex flex-col">
    <div class="ws-switcher-title">
      <Label label={login.string.SelectWorkspace} />
    </div>
    {#if hasRating}
      <div class="flex-row-center text-sm">
        <Component
          is={ratingPlugin.component.RatingRing}
          props={{ rating: sysRating?.rating ?? 0, showValues: true }}
        />
      </div>
      <div class="flex-row-center mt-2">
        <Component is={ratingPlugin.component.RatingActivities} props={{ rating: sysRating }} />
      </div>
    {/if}
  </div>

  {#if showSearch}
    <div class="p-2 ml-2 mr-2 mb-2 flex-grow flex-row-center" class:ws-switcher-disabled={loadState === 'pending'}>
      <SearchEdit bind:value={search} width={'100%'} />
      {#if isAdmin}
        <div class="p-1">
          {#if $workspacesStore.length > 500}
            500 /
          {/if}
          {$workspacesStore.length}
        </div>
      {/if}
    </div>
  {/if}
  {#if isAdmin}
    <div class="p-2 ml-2 mb-4 select-text flex-col bordered">
      {decodeTokenPayload(getMetadata(presentation.metadata.Token) ?? '').workspace ?? ''}
    </div>
  {/if}
  <div class="ap-scroll-wrap">
    <div class="ap-scroll" bind:this={scrollEl} on:scroll={updateScrollFade}>
      {#if loadState === 'error'}
        <div class="ws-switcher-message">
          <Label label={workbench.string.FailedToLoadWorkspaces} />
        </div>
      {:else if loadState === 'pending'}
        <div class="ws-switcher-message">
          <Loading />
        </div>
      {:else if $workspacesStore.length === 0}
        <div class="ws-switcher-message">
          <Label label={workbench.string.NoWorkspacesFound} />
        </div>
      {:else}
        <div class="ap-box">
          {#each sortedWorkspaces as ws, i}
            {@const wsName = ws.name ?? ws.url}
            {@const _activeSession = activeSessions[ws.uuid]}
            {@const isCurrentWs = ws.url === currentWsUrl}
            {@const lastUsageDays = getWorkspaceLastVisitDays(ws.lastVisit)}
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
                class:current-ws={isCurrentWs}
                class:hover={btns[i] === activeElement}
                on:mousemove={() => {
                  focusTarget(btns[i])
                }}
              >
                <!-- <div class="drag"><Drag size={'small'} /></div> -->
                <div class="mr-2">
                  <WorkspaceAvatar
                    colorSeed={ws.uuid}
                    displayName={wsName}
                    avatarUrl={getAvatarUrl(ws, isCurrentWs, currentWsSetting)}
                    size={'small'}
                    hasUnread={ws.hasUnread === true && !isCurrentWs}
                    ringColor={'var(--theme-popup-color)'}
                  />
                </div>
                <!-- <div class="flex-col flex-grow"> -->
                <div class="flex-col flex-grow">
                  <span class="label overflow-label flex flex-grow flex-between">
                    <span class="flex-row-center" class:current-ws-name={isCurrentWs}>
                      {wsName}
                    </span>
                    {#if isArchivingMode(ws.mode)}
                      - <Label label={presentation.string.Archived} />
                    {/if}
                    {#if isAdmin}
                      {#if ws.region != null && ws.region !== ''}
                        - ({ws.region})
                      {/if}
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
                        ({lastUsageDays ?? 0} days)
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
                <span class="ws-lastvisit">
                  {lastUsageDays === undefined ? '' : `${lastUsageDays} d`}
                </span>
                <div class="ap-check">
                  {#if isCurrentWs}
                    <IconCheck size={'small'} />
                  {/if}
                </div>
              </button>
            </a>
          {/each}
        </div>
      {/if}
    </div>
    {#if canScrollMore}
      <div class="ap-scroll-fade" />
    {/if}
  </div>
  <div class="ap-space x2" />
</div>

<style lang="scss">
  .active {
    background-color: var(--theme-inbox-people-counter-bgcolor);
  }
  .ws-switcher {
    min-width: 20rem;
  }
  .ws-switcher-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--theme-caption-color);
  }
  .current-ws {
    background-color: var(--theme-button-default);
  }
  .current-ws-name {
    font-weight: 600;
  }
  .ap-scroll-wrap {
    position: relative;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    min-height: 0;
  }
  .ap-scroll {
    max-height: 31.5rem;
    min-height: 2rem;
    padding: 0 0.375rem;
    scrollbar-color: var(--scrollbar-bar-hover) transparent;

    &::-webkit-scrollbar {
      width: 0.5rem;
    }
    &::-webkit-scrollbar-thumb {
      background-color: var(--scrollbar-bar-hover);
    }
  }
  .ap-scroll-fade {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1.5rem;
    background: linear-gradient(to bottom, transparent, var(--theme-popup-color));
    pointer-events: none;
  }
  .ws-switcher-message {
    height: 8rem;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: var(--theme-dark-color);
    font-size: 0.8125rem;
  }
  .ws-switcher-disabled {
    opacity: 0.5;
    pointer-events: none;
  }
  .ws-lastvisit {
    flex-shrink: 0;
    margin-left: 0.75rem;
    font-size: 0.75rem;
    color: var(--theme-dark-color);
  }
</style>
