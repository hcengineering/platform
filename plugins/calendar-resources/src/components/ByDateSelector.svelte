<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { Button } from '@hcengineering/ui'

  export let disabled: boolean
  export let selected: number[]

  function onSelect (val: number): void {
    if (disabled) return
    if (selected.includes(val)) {
      selected = selected.filter((v) => v !== val)
    } else {
      selected.push(val)
    }
    selected = selected
  }
</script>

<div class="days-of-month" style:grid-template-rows={`repeat(${5}, ${'1.5rem'})`}>
  {#each [...Array(5).keys()] as weekIndex}
    {#each [...Array(7).keys()] as dayOfWeek}
      {@const value = weekIndex * 7 + dayOfWeek + 1}
      {#if value <= 31}
        <div
          class="cell"
          class:selected={selected.includes(value)}
          class:top-border={weekIndex === 0}
          class:left-border={dayOfWeek === 0}
          style:grid-column-start={dayOfWeek + 1}
          style:grid-row-start={weekIndex + 1}
        >
          <Button
            width={'100%'}
            on:click={() => {
              onSelect(value)
            }}
            {disabled}
            padding={'0'}
            size={'inline'}
            kind={'ghost'}
          >
            <svelte:fragment slot="content">
              {value}
            </svelte:fragment>
          </Button>
        </div>
      {/if}
    {/each}
  {/each}
</div>

<style lang="scss">
  .days-of-month {
    display: grid;
    grid-auto-columns: max-content;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    width: 100%;
  }

  .cell {
    border-bottom: 1px solid var(--theme-divider-color);
    border-right: 1px solid var(--theme-divider-color);
    display: flex;
    justify-content: center;
    align-items: center;

    &.left-border {
      border-left: 1px solid var(--theme-divider-color);
    }

    &.top-border {
      border-top: 1px solid var(--theme-divider-color);
    }

    &.selected {
      background-color: var(--theme-navpanel-selected);
    }
  }

  .days-of-month {
    justify-items: stretch;
    align-items: stretch;
  }
</style>
