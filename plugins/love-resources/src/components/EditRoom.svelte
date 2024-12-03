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
  import { getClient } from '@hcengineering/presentation'
  import { EditBox, ModernButton } from '@hcengineering/ui'
  import { Room, isOffice } from '@hcengineering/love'
  import { createEventDispatcher, onMount } from 'svelte'
  import { personByIdStore } from '@hcengineering/contact-resources'
  import { IntlString } from '@hcengineering/platform'

  import love from '../plugin'
  import { getRoomName, tryConnect, isConnected } from '../utils'
  import { infos, invites, myInfo, myRequests, selectedRoomPlace, myOffice, currentRoom } from '../stores'

  export let object: Room
  export let readonly: boolean = false

  const client = getClient()
  const dispatch = createEventDispatcher()

  let newName = getRoomName(object, $personByIdStore)
  let connecting = false

  async function changeName (): Promise<void> {
    if (isOffice(object)) {
      return
    }

    await client.diffUpdate(object, { name: newName })
  }

  onMount(() => {
    dispatch('open', { ignoreKeys: ['name'] })
  })

  let tryConnecting = false

  async function connect (): Promise<void> {
    tryConnecting = true
    const place = $selectedRoomPlace
    await tryConnect(
      $personByIdStore,
      $myInfo,
      object,
      $infos,
      $myRequests,
      $invites,
      place?._id === object._id ? { x: place.x, y: place.y } : undefined
    )
    tryConnecting = false
    selectedRoomPlace.set(undefined)
  }

  $: connecting = tryConnecting || ($currentRoom?._id === object._id && !$isConnected)

  let connectLabel: IntlString = $infos.some(({ room }) => room === object._id)
    ? love.string.JoinMeeting
    : love.string.StartMeeting

  $: if ($infos.some(({ room }) => room === object._id) && !connecting) {
    connectLabel = love.string.JoinMeeting
  } else if (!connecting) {
    connectLabel = love.string.StartMeeting
  }

  function showConnectionButton (
    object: Room,
    connecting: boolean,
    isConnected: boolean,
    myOffice?: Room,
    currentRoom?: Room
  ): boolean {
    // Do not show connect button in my office
    if (object._id === myOffice?._id) return false
    // Show during connecting with spinner
    if (connecting) return true
    // Do not show connect button if we are already connected to the room
    if (isConnected && currentRoom?._id === object._id) return false

    return true
  }
</script>

<div class="flex-row-stretch">
  <div class="row flex-grow">
    <div class="name">
      <EditBox
        disabled={readonly || isOffice(object)}
        placeholder={love.string.Room}
        on:change={changeName}
        bind:value={newName}
        focusIndex={1}
      />
    </div>
    {#if showConnectionButton(object, connecting, $isConnected, $myOffice, $currentRoom)}
      <ModernButton label={connectLabel} size="large" kind={'primary'} on:click={connect} loading={connecting} />
    {/if}
  </div>
</div>

<style lang="scss">
  .name {
    font-weight: 500;
    font-size: 1.25rem;
    color: var(--theme-caption-color);
    width: 100%;
  }

  .row {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    justify-content: space-between;
  }
</style>
