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
  import { Button, Label } from '@hcengineering/ui'
  import { JoinRequest, RequestStatus } from '@hcengineering/love'
  import love from '../plugin'
  import { rooms } from '../stores'
  import { getRoomLabel } from '../utils'
  import { personByIdStore } from '@hcengineering/contact-resources'

  export let request: JoinRequest

  $: room = $rooms.find((p) => p._id === request.room)

  async function cancel () {
    if (request.status === RequestStatus.Pending) {
      const client = getClient()
      await client.remove(request)
    }
  }
</script>

<div class="antiPopup flex-col-center">
  <div class="mb-4 flex-col-center flex-gap-2">
    <Label label={love.string.KnockingTo} params={{ name: room?.name }} />
    <span class="title">
      {#if room}
        <Label label={getRoomLabel(room, $personByIdStore)} />
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
