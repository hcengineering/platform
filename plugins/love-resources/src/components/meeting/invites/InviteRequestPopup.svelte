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
  import contact, { Person } from '@hcengineering/contact'
  import { CombineAvatars } from '@hcengineering/contact-resources'
  import { Button, Label } from '@hcengineering/ui'
  import love from '../../../plugin'
<<<<<<<< HEAD:plugins/love-resources/src/components/meeting/invites/InviteRequestPopup.svelte
  import { Ref } from '@hcengineering/core'
  import { onMount } from 'svelte'
  import {
    cancelInvites,
    closeInvitesPopup,
    inviteRequestSecondsToLive,
    subscribeInviteResponses,
    unsubscribeInviteResponses,
    updateInvites
  } from '../../../invites'

  export let persons: Array<Ref<Person>>
  export let meetingId: string

  onMount(() => {
    void subscribeInviteResponses()
    void doUpdateInvites()
    const interval = setInterval(doUpdateInvites, (inviteRequestSecondsToLive - 2) * 1000)
    return () => {
      void unsubscribeInviteResponses()
      clearInterval(interval)
      void cancelInvites(meetingId)
    }
  })

  async function doUpdateInvites (): Promise<void> {
    await updateInvites(persons, meetingId)
  }

  async function cancel (): Promise<void> {
    closeInvitesPopup()
========
  import { cancelInvites } from '../../../meetings'
  import { activeInvites } from '../../../stores'

  $: persons = $activeInvites.map((p) => p.target)

  async function cancel (): Promise<void> {
    await cancelInvites($activeInvites)
>>>>>>>> develop:plugins/love-resources/src/components/meeting/invites/ActiveInvitesPopup.svelte
  }
</script>

<div class="antiPopup flex-col-center">
  <span class="title">
    <Label label={love.string.YouInivite} />
  </span>
  <div class="p-4">
    <CombineAvatars _class={contact.class.Person} size={'large'} items={persons} limit={5} />
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
