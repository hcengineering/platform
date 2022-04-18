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
  import { IssuesGrouping } from '@anticrm/tracker'
  import { Label } from '@anticrm/ui'
  import tracker from '../../plugin'
  import { issuesGroupByOptions } from '../../utils'
  import DropdownNative from '../DropdownNative.svelte'
  import { createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher()

  export let groupBy: IssuesGrouping | undefined = undefined

  const groupByItems = issuesGroupByOptions

  $: dispatch('update', groupBy)
</script>

<div class="root">
  <div class="sortingContainer">
    <div class="viewOption">
      <div class="label">
        <Label label={tracker.string.Grouping} />
      </div>
      <div class="dropdownContainer">
        <DropdownNative items={groupByItems} bind:selected={groupBy} />
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .root {
    display: flex;
    flex-direction: column;
    width: 17rem;
    background-color: var(--board-card-bg-color);
  }

  .sortingContainer {
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--popup-divider);
  }

  .viewOption {
    display: flex;
    min-height: 2rem;
  }

  .label {
    display: flex;
    align-items: center;
    min-width: 5rem;
    color: var(--theme-content-dark-color);
  }

  .dropdownContainer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-grow: 1;
  }
</style>
