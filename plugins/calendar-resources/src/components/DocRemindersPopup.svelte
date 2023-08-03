<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Event } from '@hcengineering/calendar'
  import { PersonAccount } from '@hcengineering/contact'
  import { Class, Doc, getCurrentAccount, Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Button, deviceOptionsStore as deviceInfo, IconAdd, Label, Scroller, showPopup } from '@hcengineering/ui'
  import calendar from '../plugin'
  import CreateReminder from './CreateReminder.svelte'
  import ReminderPresenter from './ReminderPresenter.svelte'

  export let attachedTo: Ref<Doc>
  export let attachedToClass: Ref<Class<Doc>>
  export let title: string | undefined

  const currentUser = getCurrentAccount() as PersonAccount
  let events: Event[] = []
  const query = createQuery()
  $: query.query(
    calendar.class.Event,
    {
      attachedTo,
      participants: currentUser.person
    },
    (res) => {
      events = res.filter((p) => p.reminders !== undefined && p.reminders.length > 0)
    }
  )

  function click (ev: MouseEvent): void {
    showPopup(CreateReminder, { attachedTo, attachedToClass, title }, ev.target as HTMLElement)
  }

  $: isMobile = $deviceInfo.isMobile
</script>

<div class="notifyPopup" class:min-w-168={!isMobile}>
  <div class="header flex-between">
    <span class="fs-title overflow-label"><Label label={calendar.string.Reminders} /></span>
    <Button icon={IconAdd} size={'medium'} kind={'ghost'} on:click={(e) => click(e)} />
  </div>
  <Scroller>
    <div class="px-4 clear-mins">
      {#each events as event}
        <ReminderPresenter value={event} />
      {/each}
    </div>
  </Scroller>
</div>
