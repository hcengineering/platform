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
  import { createEventDispatcher, afterUpdate, onDestroy } from 'svelte'
  import calendar, { Calendar, generateEventId } from '@hcengineering/calendar'
  import { PersonAccount } from '@hcengineering/contact'
  import { Ref, getCurrentAccount } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { TagElement } from '@hcengineering/tags'
  import { Separator, defineSeparators, deviceOptionsStore as deviceInfo } from '@hcengineering/ui'
  import { ToDosMode } from '..'
  import PlanningCalendar from './PlanningCalendar.svelte'
  import ToDosNavigator from './ToDosNavigator.svelte'
  import ToDos from './ToDos.svelte'
  import { timeSeparators } from '../utils'
  import { dragging } from '../dragging'
  import time from '../plugin'
  import { Analytics } from '@hcengineering/analytics'
  import { TimeEvents } from '@hcengineering/time'

  const dispatch = createEventDispatcher()

  const defaultDuration = 30 * 60 * 1000
  let mainPanel: HTMLElement
  let replacedPanel: HTMLElement

  let currentDate: Date = new Date()

  $: dragItem = $dragging.item
  $: visibleCalendar = $deviceInfo.docWidth > 800

  const client = getClient()

  async function drop (e: CustomEvent<any>) {
    if (dragItem === null) return
    const doc = dragItem
    const date = e.detail.date.getTime()
    const currentUser = getCurrentAccount() as PersonAccount
    const extCalendar = await client.findOne(calendar.class.ExternalCalendar, {
      createdBy: currentUser._id,
      hidden: false,
      default: true
    })
    const _calendar = extCalendar ? extCalendar._id : (`${currentUser._id}_calendar` as Ref<Calendar>)
    const dueDate = date + defaultDuration
    await client.addCollection(time.class.WorkSlot, calendar.space.Calendar, doc._id, doc._class, 'workslots', {
      calendar: _calendar,
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
    Analytics.handleEvent(TimeEvents.ToDoScheduled, { id: doc._id })
  }

  defineSeparators('time', timeSeparators)

  let mode: ToDosMode = (localStorage.getItem('todos_last_mode') as ToDosMode) ?? 'unplanned'
  let tag: Ref<TagElement> | undefined = (localStorage.getItem('todos_last_tag') as Ref<TagElement>) ?? undefined

  dispatch('change', true)
  afterUpdate(() => {
    $deviceInfo.replacedPanel = replacedPanel ?? mainPanel
  })
  onDestroy(() => ($deviceInfo.replacedPanel = undefined))
</script>

{#if $deviceInfo.navigator.visible}
  <ToDosNavigator bind:mode bind:tag bind:currentDate />
  <Separator name={'time'} float={$deviceInfo.navigator.float} index={0} separatorSize={0} />
{/if}
<div
  class="antiPanel-PlanView flex-col clear-mins"
  class:left-divider={!$deviceInfo.navigator.visible}
  bind:this={mainPanel}
>
  <ToDos {mode} {tag} bind:currentDate />
</div>
{#if visibleCalendar}
  <Separator name={'time'} index={1} color={'transparent'} separatorSize={0} short />
  <PlanningCalendar
    {dragItem}
    bind:element={replacedPanel}
    bind:currentDate
    displayedDaysCount={5}
    on:dragDrop={drop}
  />
{/if}

<style lang="scss">
  .antiPanel-PlanView {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    background-color: var(--theme-workbench-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--small-focus-BorderRadius);
    min-width: 320px;
  }
</style>
