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
  import { formatName, Person } from '@hcengineering/contact'
  import { Avatar, getPersonByPersonRefCb } from '@hcengineering/contact-resources'
  import { playNotificationSound } from '@hcengineering/presentation'
  import { Button, Label } from '@hcengineering/ui'
  import { Invite } from '@hcengineering/love'
  import { onDestroy, onMount } from 'svelte'

  import love from '../../../plugin'
  import { acceptInvite, rejectInvite } from '../../../meetingController'

  export let invite: Invite

  let person: Person | undefined = undefined
  $: getPersonByPersonRefCb(invite.from, (p) => {
    person = p ?? undefined
  })

  let stopSound: (() => void) | null = null

  async function accept (): Promise<void> {
    await acceptInvite(invite)
  }

  async function decline (): Promise<void> {
    await rejectInvite(invite)
  }

  onMount(async () => {
    stopSound = await playNotificationSound(love.sound.Knock, love.class.Invite, true)
  })

  onDestroy(() => {
    stopSound?.()
  })
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
