<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { ColorDefinition, getPlatformColors, themeStore } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import view from '../plugin'
  import PopupDialog from './PopupDialog.svelte'

  export let colors: readonly ColorDefinition[] = getPlatformColors($themeStore.dark)
  export let columns: number | 'auto' = 8
  export let selected: string | undefined = undefined
  export let key: 'color' | 'icon' = 'color'
  export let embedded: boolean = false
  export let disabled: boolean = false

  const dispatch = createEventDispatcher()
</script>

{#if columns === 'auto'}
  <div class="color-flex">
    {#each colors as color, i}
      {@const col = key === 'color' ? color.color : color.icon}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="color"
        class:disabled
        class:selected={selected === color.name}
        style="background-color: {col}"
        data-id={color.name}
        on:click={() => {
          if (disabled) return
          dispatch('close', i)
        }}
      />
    {/each}
  </div>
{:else}
  <PopupDialog label={view.string.ChooseAColor} {embedded}>
    <div class="color-grid" style="grid-template-columns: repeat({columns}, 1.5rem)">
      {#each colors as color, i}
        {@const col = key === 'color' ? color.color : color.icon}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          class="color"
          class:disabled
          class:selected={selected === color.name}
          style="background-color: {col}"
          data-id={color.name}
          on:click={() => {
            if (disabled) return
            dispatch('close', i)
          }}
        />
      {/each}
    </div>
  </PopupDialog>
{/if}

<style lang="scss">
  .color-flex {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    align-content: flex-start;
    align-self: stretch;
    gap: var(--spacing-0_75);
    padding: var(--spacing-2);

    .color {
      position: relative;
      width: var(--global-small-Size);
      height: var(--global-small-Size);
      border-radius: var(--large-BorderRadius);

      &:not(.selected) {
        cursor: pointer;
      }
      &.selected::after {
        content: '';
        position: absolute;
        inset: 0;
        background-image: url("data:image/svg+xml,%3C%3Fxml version='1.0' encoding='utf-8'%3F%3E%3Csvg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 32 32'%3E%3Cpath fill='%23FFFFFF' d='M23.6,10.9c-0.6-0.6-1.5-0.6-2.1,0l-6.9,6.9l-3.4-3.4c-0.6-0.6-1.5-0.6-2.1,0c-0.6,0.6-0.6,1.5,0,2.1l5.6,5.6l9.1-9.1C24.1,12.5,24.1,11.5,23.6,10.9z'/%3E%3C/svg%3E%0A");
      }
      &.disabled {
        cursor: default;
      }
    }
  }
  .color-grid {
    display: grid;
    grid-auto-rows: 1.5rem;
    gap: 1rem;

    .color {
      border: 1px solid transparent;
      border-radius: 50%;
      cursor: pointer;

      &:hover {
        box-shadow: 0 0 0 2px var(--primary-button-outline);
      }
      &.selected {
        border-color: var(--caption-color);
        box-shadow: 0 0 0 2px var(--trans-content-20);

        &:hover {
          border-color: var(--system-error-color);
          box-shadow: 0 0 0 2px var(--trans-content-20);
        }
      }
    }
  }
</style>
