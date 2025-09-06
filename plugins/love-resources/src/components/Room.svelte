<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import presentation, { ActionContext } from '@hcengineering/presentation'
  import { Room as TypeRoom } from '@hcengineering/love'
  import { getMetadata } from '@hcengineering/platform'
  import { Label, Loading, deviceOptionsStore as deviceInfo } from '@hcengineering/ui'
  import { onDestroy, onMount } from 'svelte'

  import love from '../plugin'
  import { waitForOfficeLoaded, currentRoom, infos, invites, myInfo, myRequests } from '../stores'
  import { isFullScreen, lk, tryConnect } from '../utils'
  import ControlBar from './meeting/ControlBar.svelte'
  import { lkSessionConnected } from '../liveKitClient'
  import ParticipantsListView from './meeting/ParticipantsListView.svelte'
  import ScreenSharingView from './meeting/ScreenSharingView.svelte'

  export let withVideo: boolean
  export let canMaximize: boolean = true
  export let room: TypeRoom

  let roomEl: HTMLDivElement

  let withScreenSharing: boolean = false
  let loading: boolean = false
  let configured: boolean = false

  onMount(async () => {
    loading = true

    const wsURL = getMetadata(love.metadata.WebSocketURL)

    if (wsURL === undefined) {
      return
    }

    configured = true

    await waitForOfficeLoaded()

    if (!$lkSessionConnected && $myInfo?.sessionId === getMetadata(presentation.metadata.SessionId)) {
      const info = $infos.filter((p) => p.room === room._id)
      await tryConnect($myInfo, room, info, $myRequests, $invites)
    }
    roomEl && roomEl.addEventListener('fullscreenchange', handleFullScreen)
    loading = false
  })

  let gridStyle = ''
  let columns: number = 0
  let rows: number = 0

  onDestroy(() => {
    roomEl.removeEventListener('fullscreenchange', handleFullScreen)
  })

  function updateStyle (count: number, screenSharing: boolean): void {
    columns = screenSharing ? 1 : Math.min(Math.ceil(Math.sqrt(count)), 8)
    rows = Math.ceil(count / columns)
    gridStyle = `grid-template-columns: repeat(${columns}, 1fr); aspect-ratio: ${columns * 1280}/${rows * 720};`
  }

  const handleFullScreen = () => ($isFullScreen = document.fullscreenElement != null)

  function checkFullscreen (): void {
    const needFullScreen = $isFullScreen
    if (document.fullscreenElement && !needFullScreen) {
      document
        .exitFullscreen()
        .then(() => {
          $isFullScreen = false
        })
        .catch((err) => {
          console.log(`Error exiting fullscreen mode: ${err.message} (${err.name})`)
          $isFullScreen = false
        })
    } else if (!document.fullscreenElement && needFullScreen && roomEl != null) {
      roomEl
        .requestFullscreen()
        .then(() => {
          $isFullScreen = true
        })
        .catch((err) => {
          console.log(`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`)
          $isFullScreen = false
        })
    }
  }

  function onFullScreen (): void {
    const needFullScreen = !$isFullScreen
    if (!document.fullscreenElement && needFullScreen && roomEl != null) {
      roomEl
        .requestFullscreen()
        .then(() => {
          $isFullScreen = true
        })
        .catch((err) => {
          console.log(`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`)
          $isFullScreen = false
        })
    } else if (!needFullScreen) {
      document
        .exitFullscreen()
        .then(() => {
          $isFullScreen = false
        })
        .catch((err) => {
          console.log(`Error exiting fullscreen mode: ${err.message} (${err.name})`)
          $isFullScreen = false
        })
    }
  }

  $: if (((document.fullscreenElement && !$isFullScreen) || $isFullScreen) && roomEl) checkFullscreen()
  $: updateStyle(lk.numParticipants, withScreenSharing)
</script>

<div bind:this={roomEl} class="flex-col-center w-full h-full" class:theme-dark={$isFullScreen}>
  <ActionContext context={{ mode: 'workbench' }} />
  {#if !configured}
    <div class="flex justify-center error h-full w-full clear-mins">
      <Label label={love.string.ServiceNotConfigured} />
    </div>
  {:else if loading}
    <Loading />
  {/if}
  <div
    class="room-container"
    class:sharing={withScreenSharing}
    class:many={columns > 3}
    class:hidden={loading}
    class:mobile={$deviceInfo.isMobile}
  >
    <div class="screenContainer">
      <ScreenSharingView bind:hasActiveTrack={withScreenSharing} />
    </div>
    {#if withVideo}
      <div class="videoGrid" style={withScreenSharing ? '' : gridStyle} class:scroll-m-0={withScreenSharing}>
        <ParticipantsListView
          room={room._id}
          on:participantsCount={(evt) => {
            updateStyle(evt.detail, withScreenSharing)
          }}
        />
      </div>
    {/if}
  </div>
  {#if $currentRoom}
    <ControlBar room={$currentRoom} fullScreen={$isFullScreen} {onFullScreen} {canMaximize} />
  {/if}
</div>

<style lang="scss">
  .error {
    font-weight: 500;
    font-size: 1.5rem;
    align-items: center;
  }
  .room-container {
    display: flex;
    justify-content: center;
    padding: 1rem;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;

    .screenContainer {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      max-height: 100%;
      min-height: 0;
      width: 100%;
      border-radius: 0.75rem;

      .screen {
        object-fit: contain;
        max-width: 100%;
        max-height: 100%;
        height: 100%;
        width: 100%;
        border-radius: 0.75rem;
      }
    }
    &:not(.sharing) {
      gap: 0;

      .videoGrid {
        display: grid;
        grid-auto-rows: 1fr;
        justify-content: center;
        align-items: center;
        gap: 1rem;
        max-height: 100%;
        max-width: 100%;
      }
      .screenContainer {
        display: none;
      }
    }
    &.sharing {
      gap: 1rem;

      .videoGrid {
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin: 0.5rem 0;
        padding: 0 0.5rem;
        width: 15rem;
        min-width: 15rem;
        min-height: 0;
        max-width: 15rem;
      }
    }

    &.many {
      padding: 0.5rem;

      &:not(.sharing) .videoGrid,
      &.sharing {
        gap: 0.5rem;
      }
    }

    &.mobile {
      padding: var(--spacing-0_5);

      &:not(.sharing) .videoGrid,
      &.sharing {
        gap: var(--spacing-0_5);
      }
    }
  }
  .hidden {
    display: none;
  }
</style>
