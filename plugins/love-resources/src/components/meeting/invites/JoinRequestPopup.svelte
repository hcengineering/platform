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
  import { Button, Label } from '@hcengineering/ui'
<<<<<<<< HEAD:plugins/love-resources/src/components/meeting/invites/JoinRequestPopup.svelte
  import love from '../../../plugin'
  import { rooms } from '../../../stores'
  import { getRoomLabel } from '../../../utils'
  import {
    cancelJoinRequest,
    closeJoinRequestPopup,
    joinRequestSecondsToLive,
    subscribeJoinResponses,
    unsubscribeJoinResponses,
    updateJoinRequest
  } from '../../../joinRequests'
  import { onMount } from 'svelte'
========
  import { JoinRequest } from '@hcengineering/love'
  import love from '../../../plugin'
  import { rooms } from '../../../stores'
  import { getRoomLabel } from '../../../utils'
  import { cancelJoinRequest } from '../../../meetings'
>>>>>>>> develop:plugins/love-resources/src/components/meeting/invites/RequestingPopup.svelte

  export let meetingId: string

  $: room = $rooms.find((p) => p._id === meetingId)

  onMount(() => {
    void subscribeJoinResponses()
    void doUpdateRequest()
    const interval = setInterval(doUpdateRequest, (joinRequestSecondsToLive - 2) * 1000)
    return () => {
      void unsubscribeJoinResponses()
      clearInterval(interval)
      void cancelJoinRequest()
    }
  })

  async function doUpdateRequest (): Promise<void> {
    await updateJoinRequest()
  }

  async function cancel (): Promise<void> {
<<<<<<<< HEAD:plugins/love-resources/src/components/meeting/invites/JoinRequestPopup.svelte
    closeJoinRequestPopup()
========
    await cancelJoinRequest(request)
>>>>>>>> develop:plugins/love-resources/src/components/meeting/invites/RequestingPopup.svelte
  }
</script>

<div class="antiPopup flex-col-center">
  <div class="mb-4 flex-col-center flex-gap-2">
    <Label label={love.string.KnockingTo} params={{ name: room?.name }} />
    <span class="title">
      {#if room}
        {#await getRoomLabel(room) then label}
          <Label {label} />
        {/await}
      {/if}
    </span>
  </div>
  <div class="flex-row-center p-1 w-full">
    <Button label={love.string.Cancel} width={'100%'} on:click={cancel} />
  </div>
</div>

<style lang="scss">
  .antiPopup {
    padding-top: 1rem;
    width: 20rem;
  }

  .title {
    color: var(--caption-color);
    font-size: 700;
  }
</style>
