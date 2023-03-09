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
  import { createEventDispatcher } from 'svelte'
  import { getPlatformColors } from '@hcengineering/ui'
  import PopupDialog from './PopupDialog.svelte'
  import view from '../plugin'

  export let colors: readonly string[] = getPlatformColors()
  export let columns: number = 5
  export let selected: string | undefined = undefined

  const dispatch = createEventDispatcher()
</script>

<PopupDialog label={view.string.ChooseAColor}>
  <div class="color-grid" style="grid-template-columns: repeat({columns}, 1.5rem)">
    {#each colors as color, i}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        class="color"
        class:selected={selected === color}
        style="background-color: {color}"
        on:click={() => {
          dispatch('close', i)
        }}
      />
    {/each}
  </div>
</PopupDialog>

<style lang="scss">
  .color-grid {
    display: grid;
    grid-auto-rows: 1.5rem;
    gap: 1rem;

    .color {
      border: 1px solid transparent;
      border-radius: 50%;
      cursor: pointer;

      &:hover {
        border-color: var(--primary-button-focused-border);
        box-shadow: 0 0 0 3px var(--primary-button-outline);
      }
      &.selected {
        border-color: var(--caption-color);
        box-shadow: 0 0 0 3px var(--trans-content-20);

        &:hover {
          border-color: var(--system-error-color);
          box-shadow: 0 0 0 3px var(--trans-content-20);
        }
      }
    }
  }
</style>
