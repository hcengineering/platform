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
  import { formatName } from '@hcengineering/contact'
  import { Avatar, personByIdStore } from '@hcengineering/contact-resources'
  import { getClient } from '@hcengineering/presentation'
  import { Button, Label } from '@hcengineering/ui'
  import { Invite, RequestStatus, getFreeRoomPlace } from '@hcengineering/love'
  import love from '../plugin'
  import { infos, myInfo, rooms } from '../stores'
  import { connectRoom } from '../utils'

  export let invite: Invite

  $: person = $personByIdStore.get(invite.from)

  async function accept (): Promise<void> {
    const room = $rooms.find((p) => p._id === invite.room)
    if (room === undefined) return
    const myPerson = $personByIdStore.get(invite.target)
    if (myPerson === undefined) return
    if ($myInfo === undefined) return
    await getClient().update(invite, { status: RequestStatus.Approved })
    const place = getFreeRoomPlace(
      room,
      $infos.filter((p) => p.room === room?._id),
      myPerson._id
    )
    await connectRoom(place.x, place.y, $myInfo, myPerson, room)
  }
  async function decline (): Promise<void> {
    await getClient().update(invite, { status: RequestStatus.Rejected })
  }
</script>

<div class="antiPopup flex-col-center">
  {#if person}
    <div class="p-4 flex-col-center flex-gap-4">
      <Avatar {person} size={'large'} name={person.name} />
      <span class="title">
        <Label label={love.string.InvitingYou} params={{ name: formatName(person.name) }} />
      </span>
    </div>
  {/if}
  <div class="flex-between w-full buttons">
    <div class="p-1 w-full">
      <Button label={love.string.Accept} width={'100%'} on:click={accept} />
    </div>
    <div class="p-1 w-full">
      <Button label={love.string.Decline} width={'100%'} on:click={decline} />
    </div>
  </div>
</div>

<style lang="scss">
  .antiPopup {
    padding-top: 1rem;
    width: 20rem;
  }

  .buttons {
    padding-top: 0.25rem;
    border-top: 1px solid var(--theme-divider-color);
  }

  .title {
    color: var(--caption-color);
    font-weight: 700;
  }

  .roomTitle {
    color: var(--caption-color);
    font-weight: 700;
    font-size: 1rem;
  }
</style>
