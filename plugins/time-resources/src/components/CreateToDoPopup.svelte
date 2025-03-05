<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Analytics } from '@hcengineering/analytics'
  import { Calendar, generateEventId } from '@hcengineering/calendar'
  import { VisibilityEditor } from '@hcengineering/calendar-resources'
  import calendar from '@hcengineering/calendar-resources/src/plugin'
  import { getCurrentEmployee } from '@hcengineering/contact'
  import core, { AttachedData, Doc, Ref, SortingOrder, generateId, getCurrentAccount } from '@hcengineering/core'
  import { SpaceSelector, createQuery, getClient } from '@hcengineering/presentation'
  import tagsPlugin, { TagReference } from '@hcengineering/tags'
  import task, { makeRank } from '@hcengineering/task'
  import { StyledTextBox } from '@hcengineering/text-editor-resources'
  import { TimeEvents, ToDo, ToDoPriority, WorkSlot } from '@hcengineering/time'
  import { Button, Component, EditBox, IconClose, Label, Scroller } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import time from '../plugin'
  import DueDateEditor from './DueDateEditor.svelte'
  import PriorityEditor from './PriorityEditor.svelte'
  import Workslots from './Workslots.svelte'
  import { mySocialStringsStore } from '@hcengineering/contact-resources'

  export let object: Doc | undefined

  const me = getCurrentEmployee()
  const myAccount = getCurrentAccount()

  const todo: AttachedData<ToDo> = {
    workslots: 0,
    title: '',
    description: '',
    priority: ToDoPriority.NoPriority,
    attachedSpace: object?.space,
    visibility: 'private',
    user: me,
    rank: ''
  }

  const dispatch = createEventDispatcher()
  const client = getClient()

  export function canClose (): boolean {
    return true
  }

  let loading = false

  async function saveToDo (): Promise<void> {
    loading = true
    const ops = client.apply(undefined, 'create-todo')
    const latestTodo = await ops.findOne(
      time.class.ToDo,
      {
        user: me,
        doneOn: null
      },
      {
        sort: { rank: SortingOrder.Ascending }
      }
    )
    const id = await ops.addCollection(
      time.class.ToDo,
      time.space.ToDos,
      object?._id ?? time.ids.NotAttached,
      object?._class ?? time.class.ToDo,
      'todos',
      {
        workslots: 0,
        title: todo.title,
        description: todo.description,
        priority: todo.priority,
        visibility: todo.visibility,
        user: me,
        dueDate: todo.dueDate,
        attachedSpace: todo.attachedSpace,
        rank: makeRank(undefined, latestTodo?.rank)
      }
    )
    Analytics.handleEvent(TimeEvents.ToDoCreated, { id })
    for (const slot of slots) {
      await ops.addCollection(time.class.WorkSlot, calendar.space.Calendar, id, time.class.ToDo, 'workslots', {
        eventId: generateEventId(),
        date: slot.date,
        dueDate: slot.dueDate,
        description: todo.description,
        participants: [me],
        calendar: _calendar,
        title: todo.title,
        allDay: false,
        access: 'owner',
        visibility: todo.visibility === 'public' ? 'public' : 'freeBusy',
        reminders: []
      })
      Analytics.handleEvent(TimeEvents.ToDoScheduled, { id })
    }
    for (const tag of tags) {
      await ops.addCollection(tagsPlugin.class.TagReference, time.space.ToDos, id, time.class.ToDo, 'labels', tag)
    }
    await ops.commit()
    dispatch('close', true)
  }

  let _calendar: Ref<Calendar> = `${myAccount.primarySocialId}_calendar` as Ref<Calendar>

  const q = createQuery()
  q.query(
    calendar.class.ExternalCalendar,
    { default: true, hidden: false, createdBy: { $in: $mySocialStringsStore } },
    (res) => {
      if (res.length > 0) {
        _calendar = res[0]._id
      }
    }
  )

  let slots: WorkSlot[] = []

  function removeSlot (e: CustomEvent<{ _id: Ref<WorkSlot> }>): void {
    const index = slots.findIndex((p) => p._id === e.detail._id)
    if (index !== -1) {
      slots.splice(index, 1)
      slots = slots
    }
  }

  function createSlot (): void {
    const defaultDuration = 30 * 60 * 1000
    const now = Date.now()
    const date = Math.ceil(now / (30 * 60 * 1000)) * (30 * 60 * 1000)
    const dueDate = date + defaultDuration
    slots.push({
      eventId: generateEventId(),
      date,
      dueDate,
      description: todo.description,
      participants: [me],
      title: todo.title,
      allDay: false,
      access: 'owner',
      visibility: todo.visibility,
      reminders: [],
      calendar: _calendar,
      space: calendar.space.Calendar,
      _id: generateId(),
      _class: time.class.WorkSlot,
      attachedTo: generateId(),
      attachedToClass: time.class.ToDo,
      collection: 'workslots',
      modifiedOn: now,
      modifiedBy: myAccount.primarySocialId
    })
    slots = slots
  }

  function changeSlot (e: CustomEvent<{ startDate: number, dueDate: number, slot: Ref<WorkSlot> }>): void {
    const { startDate, dueDate, slot } = e.detail
    const workslot = slots.find((s) => s._id === slot)
    if (workslot !== undefined) {
      workslot.dueDate = dueDate
      workslot.date = startDate
      slots = slots
    }
  }

  function changeDueSlot (e: CustomEvent<{ dueDate: number, slot: Ref<WorkSlot> }>): void {
    const { dueDate, slot } = e.detail
    const workslot = slots.find((s) => s._id === slot)
    if (workslot !== undefined) {
      workslot.dueDate = dueDate
      slots = slots
    }
  }

  let tags: AttachedData<TagReference>[] = []
</script>

<div class="eventPopup-container">
  <div class="header flex-between">
    <EditBox
      bind:value={todo.title}
      kind={'ghost-large'}
      placeholder={time.string.AddTitle}
      fullSize
      focusable
      autoFocus
      focusIndex={10001}
    />
    <div class="flex-row-center gap-1 flex-no-shrink ml-3">
      <Button
        id="card-close"
        icon={IconClose}
        kind={'ghost'}
        size={'small'}
        on:click={() => {
          dispatch('close')
        }}
      />
    </div>
  </div>
  <Scroller>
    <div class="block flex-no-shrink">
      <div class="pb-4">
        <StyledTextBox
          alwaysEdit={true}
          maxHeight="limited"
          showButtons={false}
          placeholder={calendar.string.Description}
          bind:content={todo.description}
        />
      </div>
      <div class="flex-row-center gap-1-5 mb-1">
        <PriorityEditor bind:value={todo.priority} />
        <VisibilityEditor size="small" bind:value={todo.visibility} />
        <DueDateEditor bind:value={todo.dueDate} />
      </div>
    </div>
    <div class="block flex-no-shrink">
      <div class="flex-row-center gap-1-5 mb-1">
        <div>
          <Label label={time.string.AddTo} />
        </div>
        <SpaceSelector
          _class={task.class.Project}
          query={{ archived: false, members: getCurrentAccount().uuid }}
          label={core.string.Space}
          autoSelect={false}
          allowDeselect
          kind={'regular'}
          size={'medium'}
          focus={false}
          bind:space={todo.attachedSpace}
        />
      </div>
    </div>
    <div class="block flex-no-shrink">
      <div class="flex-row-center gap-1-5 mb-1">
        <Component
          is={tagsPlugin.component.DraftTagsEditor}
          props={{ tags, targetClass: time.class.ToDo }}
          on:update={(e) => {
            tags = [...e.detail]
          }}
        />
      </div>
    </div>
    <div class="block flex-gap-4 flex-no-shrink end">
      <Workslots
        bind:slots
        shortcuts={false}
        fixed={'createToDo'}
        on:remove={removeSlot}
        on:create={createSlot}
        on:change={changeSlot}
        on:dueChange={changeDueSlot}
      />
    </div>
    <div class="flex-row-reverse btn flex-no-shrink">
      <Button
        kind="primary"
        {loading}
        label={time.string.AddToDo}
        on:click={saveToDo}
        disabled={todo?.title === undefined || todo?.title === ''}
      />
    </div>
  </Scroller>
</div>

<style lang="scss">
  .eventPopup-container {
    display: flex;
    flex-direction: column;
    padding-top: 2rem;
    padding-bottom: 2rem;
    max-width: 40rem;
    min-width: 40rem;
    min-height: 0;
    background: var(--theme-popup-color);
    border-radius: 1rem;
    box-shadow: var(--theme-popup-shadow);

    .header {
      flex-shrink: 0;
      padding-right: 2rem;
      padding-left: 2rem;
    }

    .btn {
      padding-top: 1rem;
      padding-right: 1rem;
      padding-left: 1rem;
    }

    .block {
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
      padding-top: 1rem;
      padding-bottom: 1rem;
      padding-right: 2rem;
      padding-left: 2rem;

      &:not(.end) {
        border-bottom: 1px solid var(--theme-divider-color);
      }
    }
  }
</style>
