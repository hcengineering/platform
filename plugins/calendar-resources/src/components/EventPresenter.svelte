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
  import { getClient } from '@hcengineering/presentation'
  import { DatePresenter, DateTimeRangePresenter, Label, showPopup } from '@hcengineering/ui'
  import view, { ObjectEditor } from '@hcengineering/view'
  import calendar from '../plugin'
  import DateRangePresenter from '@hcengineering/ui/src/components/calendar/DateRangePresenter.svelte'

  export let value: Event
  export let hideDetails: boolean = false
  export let inline: boolean = false

  function click (): void {
    if (!hideDetails) {
      const client = getClient()
      const hierarchy = client.getHierarchy()
      const editor = hierarchy.classHierarchyMixin<Doc, ObjectEditor>(value._class, view.mixin.ObjectEditor)
      if (editor?.editor !== undefined) {
        showPopup(editor.editor, { object: value })
      }
    }
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="antiSelect w-full cursor-pointer flex-center flex-between" on:click={click}>
  {#if value}
    <div class="mr-4">
      {#if !hideDetails}
        {value.title}
      {:else}
        <Label label={calendar.string.Busy} />
      {/if}
    </div>
    {#if !inline}
      {#if value.allDay}
        <DatePresenter value={value.date} />
      {:else}
        <div class="flex-row-center">
          <DateTimeRangePresenter value={value.date} /> <span class="p-1">-</span>
          <DateRangePresenter value={value.dueDate} mode={DateRangeMode.TIME} editable={false} />
        </div>
      {/if}
    {/if}
  {/if}
</div>
