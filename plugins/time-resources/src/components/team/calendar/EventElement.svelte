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
  import { EventPresenter, calendarStore, isVisible } from '@hcengineering/calendar-resources'
  import { Doc } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Component, MILLISECONDS_IN_MINUTE, showPopup, tooltip } from '@hcengineering/ui'
  import view, { ObjectEditor } from '@hcengineering/view'
  import { showMenu } from '@hcengineering/view-resources'

  export let event: Event
  export let hour: number
  export let top: number

  $: width = (hour * (event.dueDate - event.date)) / MILLISECONDS_IN_MINUTE / 60
  $: left = (hour / 60) * new Date(event.date).getMinutes()
  $: empty = false

  function click (): void {
    if (visible) {
      const editor = hierarchy.classHierarchyMixin<Doc, ObjectEditor>(event._class, view.mixin.ObjectEditor)
      if (editor?.editor !== undefined) {
        showPopup(editor.editor, { object: event })
      }
    }
  }

  const client = getClient()
  const hierarchy = client.getHierarchy()
  $: presenter = hierarchy.classHierarchyMixin<Doc, CalendarEventPresenter>(
    event._class,
    calendar.mixin.CalendarEventPresenter
  )

  let div: HTMLDivElement

  $: visible = isVisible(event, $calendarStore)

  function onContext (e: MouseEvent): void {
    showMenu(e, { object: event })
  }
</script>

{#if event}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    bind:this={div}
    class="event-container"
    class:oneRow={true}
    class:empty
    style:width="{width}rem"
    style:margin-left="{left}rem"
    style:margin-top="{-3 * top}rem"
    use:tooltip={{ component: EventPresenter, props: { value: event, hideDetails: !visible } }}
    on:click|stopPropagation={click}
    on:contextmenu={onContext}
  >
    {#if !empty && presenter?.presenter}
      <Component is={presenter.presenter} props={{ event, narrow: false, oneRow: true, hideDetails: !visible }} />
    {/if}
  </div>
{/if}

<style lang="scss">
  .event-container {
    pointer-events: auto;
    overflow: hidden;
    height: 3rem;
    min-width: 0;
    min-height: 0;
    font-size: 0.8125rem;
    background-color: #f3f6fb;
    border: 1px solid rgba(43, 81, 144, 0.2);
    border-left: 0.25rem solid #2b5190;
    border-radius: 0.25rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem 0.25rem 1rem;
  }
</style>
