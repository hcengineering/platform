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
  import { personByIdStore } from '@hcengineering/contact-resources'
  import { Room as TypeRoom } from '@hcengineering/love'
  import { getMetadata } from '@hcengineering/platform'
  import { Label, Loading, deviceOptionsStore as deviceInfo } from '@hcengineering/ui'
  import { onDestroy, onMount } from 'svelte'
  import presentation from '@hcengineering/presentation'
  import { EditDoc } from '@hcengineering/view-resources'

  import love from '../plugin'
  import { storePromise, currentRoom, infos, invites, myInfo, myRequests, meetingMinutesStore } from '../stores'
  import { awaitConnect, isConnected, isCurrentInstanceConnected, isFullScreen, tryConnect } from '../utils'
  import ControlBar from './ControlBar.svelte'

  export let room: TypeRoom

  let loading: boolean = false
  let configured: boolean = false

  onMount(async () => {
    loading = true

    const wsURL = getMetadata(love.metadata.WebSocketURL)

    if (wsURL === undefined) {
      return
    }

    configured = true

    await $storePromise

    if (
      !$isConnected &&
      !$isCurrentInstanceConnected &&
      $myInfo?.sessionId === getMetadata(presentation.metadata.SessionId)
    ) {
      const info = $infos.filter((p) => p.room === room._id)
      await tryConnect($personByIdStore, $myInfo, room, info, $myRequests, $invites)
    }

    await awaitConnect()
    loading = false
  })

  let replacedPanel: HTMLElement
  $: $deviceInfo.replacedPanel = replacedPanel
  onDestroy(() => ($deviceInfo.replacedPanel = undefined))
</script>

<div class="antiPanel-component filledNav" bind:this={replacedPanel}>
  <div class="hulyComponent">
    {#if $isConnected && !$isCurrentInstanceConnected}
      <div class="flex-center justify-center error h-full w-full clear-mins">
        <Label label={love.string.AnotherWindowError} />
      </div>
    {:else if !configured}
      <div class="flex-center justify-center error h-full w-full clear-mins">
        <Label label={love.string.ServiceNotConfigured} />
      </div>
    {:else if loading || !$currentRoom || !$meetingMinutesStore}
      <Loading />
    {:else}
      <EditDoc _id={$meetingMinutesStore._id} _class={$meetingMinutesStore._class} embedded selectedAside={false} />
    {/if}
    {#if $currentRoom}
      <div class="flex-grow flex-shrink" />
      <ControlBar room={$currentRoom} fullScreen={$isFullScreen} />
    {/if}
  </div>
</div>
