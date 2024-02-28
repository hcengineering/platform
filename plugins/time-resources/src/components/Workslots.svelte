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
  import { EventTimeEditor } from '@hcengineering/calendar-resources'
  import { ActionIcon, Button, Icon, IconCircleAdd, IconClose, Scroller } from '@hcengineering/ui'
  import { WorkSlot } from '@hcengineering/time'
  import { createEventDispatcher } from 'svelte'
  import time from '../plugin'

  export let slots: WorkSlot[] = []
  const dispatch = createEventDispatcher()

  async function change (e: CustomEvent<{ startDate: number, dueDate: number }>, slot: WorkSlot): Promise<void> {
    const { startDate, dueDate } = e.detail
    dispatch('change', { startDate, dueDate, slot: slot._id })
  }

  async function dueChange (e: CustomEvent<{ dueDate: number }>, slot: WorkSlot): Promise<void> {
    const { dueDate } = e.detail
    dispatch('dueChange', { dueDate, slot: slot._id })
  }
</script>

<div class="flex-col container w-full flex-gap-1">
  <Scroller>
    {#each slots as slot}
      <div class="flex-between w-full pr-4 slot">
        <EventTimeEditor
          allDay={false}
          startDate={slot.date}
          bind:dueDate={slot.dueDate}
          on:change={(e) => change(e, slot)}
          on:dueChange={(e) => dueChange(e, slot)}
        />
        <div class="tool">
          <ActionIcon
            icon={IconClose}
            size={'small'}
            action={() => {
              dispatch('remove', { _id: slot._id })
            }}
          />
        </div>
      </div>
    {/each}
  </Scroller>
  <div class="flex-row-center">
    <div class="mr-1-5">
      <Icon icon={IconCircleAdd} size="small" />
    </div>
    <Button padding={'0 .5rem'} kind="ghost" label={time.string.AddSlot} on:click={() => dispatch('create')} />
  </div>
</div>

<style lang="scss">
  .container {
    max-height: 10rem;
  }

  .slot {
    .tool {
      visibility: hidden;
    }
    &:hover {
      .tool {
        visibility: visible;
      }
    }
  }
</style>
