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
  import { ActionContext } from '@hcengineering/presentation'
  import { Room as TypeRoom } from '@hcengineering/love'
  import { getMetadata } from '@hcengineering/platform'
  import { Label, Loading, Separator, defineSeparators, deviceOptionsStore as deviceInfo } from '@hcengineering/ui'
  import { onDestroy, onMount } from 'svelte'

  import love from '../plugin'
  import { waitForOfficeLoaded, currentRoom } from '../stores'
  import { isFullScreen } from '../utils'
  import ControlBar from './meeting/ControlBar.svelte'
  import ParticipantsListView from './meeting/ParticipantsListView.svelte'
  import ScreenSharingView from './meeting/ScreenSharingView.svelte'

  export let canMaximize: boolean = true
  export let room: TypeRoom

  let roomElement: HTMLDivElement | undefined = undefined

  let withScreenSharing: boolean = false
  let loading: boolean = false
  let configured: boolean = false

  defineSeparators('love-room', [
    { minSize: 14, size: 'auto', maxSize: 'auto' },
    { minSize: 14, size: 18, maxSize: 75 }
  ])

  onMount(async () => {
    loading = true
    const wsURL = getMetadata(love.metadata.WebSocketURL)

    if (wsURL === undefined) {
      return
    }
    configured = true

    await waitForOfficeLoaded()

    roomElement?.addEventListener('fullscreenchange', handleFullScreen)
    loading = false
  })

  onDestroy(() => {
    roomElement?.removeEventListener('fullscreenchange', handleFullScreen)
  })

  const handleFullScreen = (): void => {
    $isFullScreen = document.fullscreenElement != null
  }

  function checkFullscreen (): void {
    const needFullScreen = $isFullScreen
    if (document.fullscreenElement != null && !needFullScreen) {
      document
        .exitFullscreen()
        .then(() => {
          $isFullScreen = false
        })
        .catch((err) => {
          console.log(`Error exiting fullscreen mode: ${err.message} (${err.name})`)
          $isFullScreen = false
        })
    } else if (document.fullscreenElement == null && needFullScreen && roomElement != null) {
      roomElement
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
    if (document.fullscreenElement == null && needFullScreen && roomElement != null) {
      roomElement
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

  $: if (((document.fullscreenElement != null && !$isFullScreen) || $isFullScreen) && roomElement !== undefined) {
    checkFullscreen()
  }
</script>

<div bind:this={roomElement} class="flex-col-center w-full h-full" class:theme-dark={$isFullScreen}>
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
    class:hidden={loading}
    class:mobile={$deviceInfo.isMobile}
  >
    <div class="screenContainer">
      <ScreenSharingView bind:hasActiveTrack={withScreenSharing} />
    </div>
    {#if withScreenSharing && !$deviceInfo.isMobile}
      <Separator name={'love-room'} index={0} />
    {/if}
    <div class="participantsPane">
      <ParticipantsListView room={room._id} />
    </div>
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
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;

    .screenContainer {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 0.5rem;
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

      .participantsPane {
        flex: 1;
        --participants-gap: 1rem;
      }
      .screenContainer {
        display: none;
      }
    }
    &.sharing {
      gap: 0;

      .screenContainer {
        flex: 1 1 auto;
        min-width: 0;
      }

      .participantsPane {
        flex: 0 0 auto;
        width: clamp(14rem, 22vw, 18rem);
        max-width: clamp(14rem, 22vw, 18rem);
        min-width: 12rem;
        height: 100%;
        overflow-y: auto;
        --participants-gap: var(--spacing-0_5);
      }
    }
    &.mobile {
      padding: var(--spacing-0_5);

      .participantsPane {
        padding: var(--spacing-0_25);
        --participants-gap: var(--spacing-0_5);
      }
    }
  }
  .hidden {
    display: none;
  }

  .participantsPane {
    display: flex;
    flex: 1 1 auto;
    width: 100%;
    height: 100%;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    padding: 0.5rem;
  }

  .participantsPane :global(.participants-grid) {
    width: 100%;
    height: 100%;
    max-width: 100%;
  }
</style>
