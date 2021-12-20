<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { IntlString } from '@anticrm/platform'
  import Label from './Label.svelte'
  import StatusesBarElement from './StatusesBarElement.svelte'

  export let items: IntlString[]
                    = ['New' as IntlString, 'In progress' as IntlString, 'Interview' as IntlString, 'Interview' as IntlString, 'Final' as IntlString]
  export let selected: IntlString | undefined = undefined
</script>

<div class="flex-row-center statusesbar-container">
  {#each items as item, i}
    <div
      class="flex-row-center cursor-pointer step-lr25"
      class:selected={item === selected}
      on:click={() => {
        if (item !== selected) selected = item
      }}
    >
      <StatusesBarElement side={'left'} kind={i ? 'arrow' : 'round'} selected={item === selected} />
      <div class="flex-row-center overflow-label label">
        <Label label={item} />
      </div>
      <StatusesBarElement side={'right'} kind={i < items.length - 1 ? 'arrow' : 'round'} selected={item === selected} />
    </div>
  {/each}
</div>

<style lang="scss">
  .statusesbar-container {
    overflow-x: auto;
    padding: .125rem 0;
    &::-webkit-scrollbar:horizontal { height: .125rem; }
    &::-webkit-scrollbar-track { margin: .25rem; }
    &::-webkit-scrollbar-thumb { background-color: var(--theme-bg-accent-color); }
  }
  .label {
    padding: .5rem 2rem;
    height: 2.25rem;
    max-height: 2.25rem;
    color: var(--theme-caption-color);
    background-color: var(--theme-button-bg-enabled);
    border-top: 1px solid var(--theme-button-border-enabled);
    border-bottom: 1px solid var(--theme-button-border-enabled);
  }

  .selected {
    cursor: auto;

    .label {
      background-color: var(--dark-turquoise-01);
      border-color: transparent;
    }
  }
</style>
