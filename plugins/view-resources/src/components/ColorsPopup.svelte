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
  import PopupDialog from './PopupDialog.svelte'

  export let colors: string[] = ['#A5D179', '#77C07B', '#60B96E', '#45AEA3', '#46CBDE', '#47BDF6',
                                 '#5AADF6', '#73A6CD', '#B977CB', '#7C6FCD', '#6F7BC5', '#F28469']
  export let columns: number = 5

  const dispatch = createEventDispatcher()
</script>

<PopupDialog label={'CHOOSE A COLOR'}>
  <div class="color-grid" style="grid-template-columns: repeat({columns}, 1.5rem)">
    {#each colors as color}
      <div class="color" style="background-color: {color}" on:click={() => { dispatch('close', color) }} />
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

      &:hover { border-color: var(--theme-button-border-focused); }
    }
  }
</style>
