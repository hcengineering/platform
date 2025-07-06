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

  export let selected: number[]

  function onSelect (val: number): void {
    if (selected.includes(val)) {
      selected = selected.filter((v) => v !== val)
    } else {
      selected.push(val)
    }
    selected = selected
  }
</script>

<div class="month" style:grid-template-rows={`repeat(${3}, ${'1.5rem'})`}>
  {#each [...Array(12).keys()] as month}
    {@const value = month + 1}
    <div
      class="cell"
      class:selected={selected.includes(value)}
      class:top-border={month < 4}
      class:left-border={month % 4 === 0}
    >
      <Button
        width={'100%'}
        on:click={() => {
          onSelect(value)
        }}
        padding={'0'}
        size={'inline'}
        kind={'ghost'}
      >
        <svelte:fragment slot="content">
          {new Date(new Date().setMonth(month)).toLocaleString('default', { month: 'short' })}
        </svelte:fragment>
      </Button>
    </div>
  {/each}
</div>

<style lang="scss">
  .month {
    display: grid;
    grid-auto-columns: max-content;
    grid-template-columns: repeat(4, minmax(0, 1fr));
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
