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
  import { DatePresenter, DateTimeRangePresenter, showPopup } from '@hcengineering/ui'
  import calendar from '../plugin'

  export let value: Event
  export let inline: boolean = false

  function click (): void {
    showPopup(
      value._class === calendar.class.ReccuringInstance
        ? calendar.component.EditRecEvent
        : calendar.component.EditEvent,
      { object: value },
      'content'
    )
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="antiSelect w-full cursor-pointer flex-center flex-between" on:click={click}>
  {#if value}
    <div class="mr-4">
      {value.title}
    </div>
    {#if !inline}
      {#if value.allDay}
        <DatePresenter value={value.date} />
      {:else}
        <DateTimeRangePresenter value={value.date} />
      {/if}
    {/if}
  {/if}
</div>
