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
  import { PersonAccount, formatName } from '@hcengineering/contact'
  import { Avatar, personByIdStore } from '@hcengineering/contact-resources'
  import { getCurrentAccount } from '@hcengineering/core'
  import { getClient, playSound, stopSound } from '@hcengineering/presentation'
  import { Button, Label } from '@hcengineering/ui'
  import { JoinRequest, RequestStatus } from '@hcengineering/love'
  import love from '../plugin'
  import { myInfo, myOffice } from '../stores'
  import { connectRoom, isConnected } from '../utils'
  import { onDestroy, onMount } from 'svelte'

  export let request: JoinRequest

  $: person = $personByIdStore.get(request.person)

  const client = getClient()

  async function accept (): Promise<void> {
    await client.update(request, { status: RequestStatus.Approved })
    if (request.room === $myOffice?._id && !$isConnected) {
      const me = (getCurrentAccount() as PersonAccount).person
      const person = $personByIdStore.get(me)
      if (person === undefined) return
      await connectRoom(0, 0, $myInfo, person, $myOffice)
    }
  }

  async function decline (): Promise<void> {
    await client.update(request, { status: RequestStatus.Rejected })
  }
  onMount(() => {
    playSound(love.sound.Knock, love.class.JoinRequest, true)
  })
  onDestroy(() => {
    stopSound(love.sound.Knock)
  })
</script>

<div class="antiPopup flex-col-center">
  {#if person}
    <div class="p-4 flex-col-center flex-gap-4">
      <Avatar {person} size={'large'} name={person.name} />
      <span class="title">
        <Label label={love.string.IsKnocking} params={{ name: formatName(person.name) }} />
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
    font-size: 700;
  }
</style>
