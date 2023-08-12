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
  import calendar, { CalendarEventPresenter, Event } from '@hcengineering/calendar'
  import { Doc, DocumentUpdate } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import {
    Component,
    MILLISECONDS_IN_MINUTE,
    deviceOptionsStore,
    getEventPositionElement,
    showPopup,
    tooltip
  } from '@hcengineering/ui'
  import view, { ObjectEditor } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import EventPresenter from './EventPresenter.svelte'
  import { Menu } from '@hcengineering/view-resources'

  export let event: Event
  export let hourHeight: number
  export let size: { width: number; height: number }

  $: oneRow = size.height < 42 || event.allDay
  $: narrow = event.dueDate - event.date < MILLISECONDS_IN_MINUTE * 25
  $: empty = size.width < 44

  function click () {
    const editor = hierarchy.classHierarchyMixin<Doc, ObjectEditor>(event._class, view.mixin.ObjectEditor)
    if (editor?.editor !== undefined) {
      showPopup(editor.editor, { object: event })
    }
  }

  const client = getClient()
  const hierarchy = client.getHierarchy()
  $: presenter = hierarchy.classHierarchyMixin<Doc, CalendarEventPresenter>(
    event._class,
    calendar.mixin.CalendarEventPresenter
  )

  let div: HTMLDivElement

  const dispatch = createEventDispatcher()

  $: fontSize = $deviceOptionsStore.fontSize

  function dragStart (e: DragEvent) {
    if (event.allDay) return
    originDate = event.date
    originDueDate = event.dueDate
    const rect = div.getBoundingClientRect()
    const topThreshold = rect.y + fontSize / 2
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.dropEffect = 'move'
    }
    dragInitY = e.y
    if (e.y < topThreshold) {
      dragDirection = 'top'
    } else {
      const bottomThreshold = rect.y + rect.height - fontSize / 2
      if (e.y > bottomThreshold) {
        dragDirection = 'bottom'
      } else {
        dragDirection = 'mid'
      }
    }
  }

  let originDate = event.date
  let originDueDate = event.dueDate
  $: pixelPer15Min = hourHeight / 4
  let dragInitY: number | undefined
  let dragDirection: 'bottom' | 'mid' | 'top' | undefined

  function drag (e: DragEvent) {
    if (event.allDay) return
    if (dragInitY !== undefined) {
      const diff = Math.floor((e.y - dragInitY) / pixelPer15Min)
      if (diff) {
        if (dragDirection !== 'bottom') {
          const newValue = new Date(originDate).setMinutes(new Date(originDate).getMinutes() + 15 * diff)
          if (dragDirection === 'top') {
            if (newValue < event.dueDate) {
              event.date = newValue
              dispatch('resize')
            }
          } else {
            const newDue = new Date(originDueDate).setMinutes(new Date(originDueDate).getMinutes() + 15 * diff)
            event.date = newValue
            event.dueDate = newDue
            dispatch('resize')
          }
        } else {
          const newDue = new Date(originDueDate).setMinutes(new Date(originDueDate).getMinutes() + 15 * diff)
          if (newDue > event.date) {
            event.dueDate = newDue
            dispatch('resize')
          }
        }
      }
    }
  }

  async function drop () {
    const update: DocumentUpdate<Event> = {}
    if (originDate !== event.date) {
      update.date = event.date
    }
    if (originDueDate !== event.dueDate) {
      update.dueDate = event.dueDate
    }
    if (Object.keys(update).length > 0) {
      await client.update(event, {
        dueDate: event.dueDate,
        date: event.date
      })
    }
  }

  const showMenu = async (ev: MouseEvent, item: Event): Promise<void> => {
    ev.preventDefault()
    showPopup(Menu, { object: item }, getEventPositionElement(ev))
  }
</script>

{#if event}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    bind:this={div}
    class="event-container"
    class:oneRow
    class:empty
    draggable={!event.allDay}
    use:tooltip={{ component: EventPresenter, props: { value: event } }}
    on:click|stopPropagation={click}
    on:contextmenu={(evt) => showMenu(evt, event)}
    on:dragstart={dragStart}
    on:drag={drag}
    on:dragend={drop}
    on:drop
  >
    {#if !empty && presenter?.presenter}
      <Component is={presenter.presenter} props={{ event, narrow, oneRow }} />
    {/if}
  </div>
{/if}

<style lang="scss">
  .event-container {
    pointer-events: auto;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    font-size: 0.8125rem;
    background-color: #f3f6fb;
    border: 1px solid rgba(43, 81, 144, 0.2);
    border-left: 0.25rem solid #2b5190;
    border-radius: 0.25rem;
    cursor: pointer;

    &:not(.oneRow, .empty) {
      padding: 0.25rem 0.5rem 0.25rem 1rem;
    }
    &.oneRow:not(.empty) {
      justify-content: center;
      padding: 0 0.25rem 0 1rem;
    }
  }
</style>
