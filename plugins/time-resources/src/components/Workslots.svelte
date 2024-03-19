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
  import { ButtonBase, ButtonIcon, IconDelete, themeStore, Hotkey, HotkeyGroup } from '@hcengineering/ui'
  import { EventTimeEditor } from '@hcengineering/calendar-resources'
  import { WorkSlot } from '@hcengineering/time'
  import { createEventDispatcher } from 'svelte'
  import time from '../plugin'
  import { calculateEventsDuration, formatEventsDuration } from '../utils'
  import Label from '@hcengineering/ui/src/components/Label.svelte'

  export let slots: WorkSlot[] = []
  export let shortcuts: boolean = true

  const dispatch = createEventDispatcher()

  let duration: string
  $: formatEventsDuration(calculateEventsDuration(slots), $themeStore.language).then((res) => {
    duration = res
  })

  function handleKeyDown (event: KeyboardEvent): void {
    if (!shortcuts) return
    if (event.shiftKey && event.key === 'Enter') {
      dispatch('create')
    }
  }

  async function change (e: CustomEvent<{ startDate: number, dueDate: number }>, slot: WorkSlot): Promise<void> {
    const { startDate, dueDate } = e.detail
    dispatch('change', { startDate, dueDate, slot: slot._id })
  }

  async function dueChange (e: CustomEvent<{ dueDate: number }>, slot: WorkSlot): Promise<void> {
    const { dueDate } = e.detail
    dispatch('dueChange', { dueDate, slot: slot._id })
  }
</script>

<svelte:window on:keydown={handleKeyDown} />

<div class="flex-col w-full flex-gap-1">
  {#each slots as slot, i}
    <div class="flex justify-start items-center flex-gap-2 w-full pr-4 slot">
      <Hotkey key={(i + 1).toString()} />
      <EventTimeEditor
        allDay={false}
        startDate={slot.date}
        dueDate={slot.dueDate}
        on:change={(e) => change(e, slot)}
        on:dueChange={(e) => dueChange(e, slot)}
      />
      <div class="tool">
        <ButtonIcon
          kind="tertiary"
          size="small"
          icon={IconDelete}
          on:click={() => {
            dispatch('remove', { _id: slot._id })
          }}
        />
      </div>
    </div>
  {/each}
</div>
<div class="flex-row-center flex-gap-4">
  <ButtonBase
    kind="secondary"
    type="type-button"
    size="medium"
    label={time.string.AddSlot}
    on:click={() => dispatch('create')}
  >
    {#if shortcuts}
      <HotkeyGroup keys={['shift', 'Enter']} />
    {/if}
  </ButtonBase>
  {#if duration}
    <div class="font-regular-14">
      <Label label={time.string.SummaryDuration} />:
      <br />
      <span class="duration">{duration}</span>
    </div>
  {/if}
</div>

<style lang="scss">
  .slot {
    position: relative;
    padding: var(--spacing-1) var(--spacing-1) var(--spacing-1) var(--spacing-2_5);
    border-radius: var(--small-BorderRadius);
    background-color: var(--tag-nuance-SunshineBackground);

    &:before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 0.25rem;
      height: 100%;
      background-color: var(--tag-accent-SunshineBackground);
      border-radius: var(--small-BorderRadius) 0 0 var(--small-BorderRadius);
    }

    .tool {
      margin-left: auto;
    }
  }

  .duration {
    color: var(--tag-accent-SunshineText);
  }
</style>
