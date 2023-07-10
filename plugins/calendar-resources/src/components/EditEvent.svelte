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
  import { DateRangeMode, Doc } from '@hcengineering/core'
  import { Panel } from '@hcengineering/panel'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { StyledTextBox } from '@hcengineering/text-editor'
  import ui, {
    AnyComponent,
    Button,
    Component,
    DateRangePresenter,
    EditBox,
    IconMoreH,
    Label,
    ToggleWithLabel,
    showPopup
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { ContextMenu, ObjectPresenter, getObjectPreview } from '@hcengineering/view-resources'
  import { createEventDispatcher, tick } from 'svelte'
  import calendar from '../plugin'

  export let object: Event

  const dispatch = createEventDispatcher()
  const client = getClient()

  const query = createQuery()
  let doc: Doc | undefined

  $: if (object.attachedTo !== calendar.ids.NoAttached) {
    query.query(object.attachedToClass, { _id: object.attachedTo }, (res) => {
      doc = res[0]
    })
  }

  let presenter: AnyComponent | undefined
  async function updatePreviewPresenter (doc?: Doc): Promise<void> {
    if (doc === undefined) {
      return
    }
    presenter = doc !== undefined ? await getObjectPreview(client, doc._class) : undefined
  }

  $: updatePreviewPresenter(doc)

  $: mode = object.allDay ? DateRangeMode.DATE : DateRangeMode.DATETIME

  const defaultDuration = 30 * 60 * 1000
  const allDayDuration = 24 * 60 * 60 * 1000
  let duration = object.dueDate - object.date

  async function updateDate () {
    await client.update(object, {
      date: object.date,
      dueDate: object.dueDate,
      allDay: object.allDay
    })
  }

  async function handleNewStartDate (newStartDate: number | null) {
    if (newStartDate !== null) {
      object.date = newStartDate
      object.dueDate = object.date + (object.allDay ? allDayDuration : duration)
      if (object.allDay) {
        object.date = new Date(object.date).setUTCHours(0, 0, 0, 0)
        object.dueDate = new Date(object.dueDate).setUTCHours(0, 0, 0, 0)
      }
      await tick()
      dueDateRef.adaptValue()
      await updateDate()
    }
  }

  async function handleNewDueDate (newDueDate: number | null) {
    if (newDueDate !== null) {
      const diff = newDueDate - object.date
      if (diff > 0) {
        object.dueDate = newDueDate
        duration = diff
      } else {
        object.dueDate = object.date + (object.allDay ? allDayDuration : duration)
      }
      if (object.allDay) {
        object.date = new Date(object.date).setUTCHours(0, 0, 0, 0)
        object.dueDate = new Date(object.dueDate).setUTCHours(0, 0, 0, 0)
      }
      await tick()
      dueDateRef.adaptValue()
      await updateDate()
    }
  }

  async function allDayChangeHandler () {
    if (object.allDay) {
      object.date = new Date(object.date).setUTCHours(0, 0, 0, 0)
      object.dueDate = new Date(object.dueDate).setUTCHours(0, 0, 0, 0)
    } else {
      object.dueDate = object.date + defaultDuration
    }
    await tick()
    dueDateRef.adaptValue()
    await updateDate()
  }

  let dueDateRef: DateRangePresenter

  function showMenu (ev?: MouseEvent): void {
    if (object !== undefined) {
      showPopup(ContextMenu, { object, excludedActions: [view.action.Open] }, ev?.target as HTMLElement)
    }
  }
</script>

<Panel
  icon={calendar.icon.Calendar}
  title={object.title}
  {object}
  isAside={false}
  isHeader={false}
  on:open
  on:close={() => {
    dispatch('close')
  }}
  withoutActivity={true}
  withoutInput={true}
>
  <svelte:fragment slot="utils">
    <div class="p-1">
      <Button icon={IconMoreH} kind={'ghost'} size={'medium'} on:click={showMenu} />
    </div>
  </svelte:fragment>

  {#if doc}
    <div class="mb-4">
      <div class="flex-row-center p-1">
        <Label label={calendar.string.EventFor} />
        <div class="ml-2">
          <ObjectPresenter _class={object.attachedToClass} objectId={object.attachedTo} value={doc} />
        </div>
      </div>
      {#if presenter !== undefined && doc}
        <div class="antiPanel p-4">
          <Component is={presenter} props={{ object: doc }} />
        </div>
      {/if}
    </div>
  {/if}
  <div class="mb-2">
    <div class="mb-4">
      <EditBox
        label={calendar.string.Title}
        bind:value={object.title}
        on:change={() => client.update(object, { title: object.title })}
      />
    </div>
    <div class="mb-2">
      <StyledTextBox
        kind={'emphasized'}
        content={object.description}
        on:value={(evt) => {
          client.update(object, { description: evt.detail })
        }}
        label={calendar.string.Description}
        placeholder={calendar.string.Description}
      />
    </div>
  </div>
  <div class="flex-row-center flex-gap-2">
    <div>
      <ToggleWithLabel bind:on={object.allDay} label={calendar.string.AllDay} on:change={allDayChangeHandler} />
    </div>
    <div>
      <DateRangePresenter
        value={object.date}
        labelNull={ui.string.SelectDate}
        on:change={async (event) => await handleNewStartDate(event.detail)}
        {mode}
        kind={'regular'}
        size={'large'}
        editable
      />
    </div>
    <div>
      <DateRangePresenter
        bind:this={dueDateRef}
        value={object.dueDate}
        labelNull={calendar.string.DueTo}
        on:change={async (event) => await handleNewDueDate(event.detail)}
        {mode}
        kind={'regular'}
        size={'large'}
        editable
      />
    </div>
  </div>
</Panel>
