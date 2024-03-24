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
  import { createEventDispatcher, afterUpdate } from 'svelte'
  import calendar, { Calendar, generateEventId } from '@hcengineering/calendar'
  import { PersonAccount } from '@hcengineering/contact'
  import { Ref, getCurrentAccount } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { TagElement } from '@hcengineering/tags'
  import { Separator, defineSeparators } from '@hcengineering/ui'
  import { ToDosMode } from '..'
  import PlanningCalendar from './PlanningCalendar.svelte'
  import ToDosNavigator from './ToDosNavigator.svelte'
  import ToDos from './ToDos.svelte'
  import { timeSeparators } from '../utils'
  import { dragging } from '../dragging'
  import time from '../plugin'

  export let visibleNav: boolean = true
  export let navFloat: boolean = false
  export let appsDirection: 'vertical' | 'horizontal' = 'horizontal'

  const dispatch = createEventDispatcher()

  const defaultDuration = 30 * 60 * 1000
  let replacedPanel: HTMLElement
  let isVisiblePlannerNav: boolean = true

  let currentDate: Date = new Date()

  $: dragItem = $dragging.item

  const client = getClient()

  async function drop (e: CustomEvent<any>) {
    if (dragItem === null) return
    const doc = dragItem
    const date = e.detail.date.getTime()
    const currentUser = getCurrentAccount() as PersonAccount
    const extCalendar = await client.findOne(calendar.class.ExternalCalendar, {
      members: currentUser._id,
      archived: false,
      default: true
    })
    const space = extCalendar ? extCalendar._id : (`${currentUser._id}_calendar` as Ref<Calendar>)
    const dueDate = date + defaultDuration
    await client.addCollection(time.class.WorkSlot, space, doc._id, doc._class, 'workslots', {
      eventId: generateEventId(),
      date,
      dueDate,
      description: doc.description,
      participants: [currentUser.person],
      title: doc.title,
      allDay: false,
      access: 'owner',
      visibility: doc.visibility === 'public' ? 'public' : 'freeBusy',
      reminders: []
    })
  }

  defineSeparators('time', timeSeparators)

  let mode: ToDosMode = (localStorage.getItem('todos_last_mode') as ToDosMode) ?? 'unplanned'
  let tag: Ref<TagElement> | undefined = (localStorage.getItem('todos_last_tag') as Ref<TagElement>) ?? undefined

  dispatch('change', true)
  afterUpdate(() => {
    dispatch('change', { type: 'replacedPanel', replacedPanel })
  })
</script>

{#if visibleNav}
  {#if isVisiblePlannerNav}
    <ToDosNavigator bind:mode bind:tag bind:currentDate {navFloat} {appsDirection} />
    <Separator
      name={'time'}
      float={navFloat}
      index={0}
      disabledWhen={['panel-aside']}
      color={'var(--theme-navpanel-border)'}
    />
  {/if}
  <div class="flex-col clear-mins">
    <ToDos {mode} {tag} bind:isVisiblePlannerNav bind:currentDate />
  </div>
  <Separator name={'time'} float={navFloat} index={1} color={'transparent'} separatorSize={0} short />
{/if}
<div class="w-full clear-mins" bind:this={replacedPanel}>
  <PlanningCalendar
    {dragItem}
    {visibleNav}
    bind:currentDate
    displayedDaysCount={3}
    on:dragDrop={drop}
    on:change={(event) => (visibleNav = event.detail)}
  />
</div>
