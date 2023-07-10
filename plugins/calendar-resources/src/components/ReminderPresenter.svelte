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
  import { getResource } from '@hcengineering/platform'
  import { DateTimeRangePresenter, showPanel, tooltip } from '@hcengineering/ui'
  import view from '@hcengineering/view'

  export let value: Event

  function click (): void {
    showPanel(view.component.EditDoc, value._id, value._class, 'content')
  }

  const objectPresenter = getResource(view.component.ObjectPresenter)
</script>

<div class="antiSelect w-full cursor-pointer flex-between" on:click={click}>
  {#if value}
    {#await objectPresenter then component}
      <div class="mr-4" use:tooltip={{ component, props: { _id: value.attachedTo, _class: value.attachedToClass } }}>
        {value.title}
      </div>
    {/await}
    <div class="flex-row-center">
      {#each value.reminders ?? [] as reminder}
        <DateTimeRangePresenter value={value.date + reminder} />
      {/each}
    </div>
  {/if}
</div>
