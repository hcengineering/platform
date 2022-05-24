<!--
// Copyright © 2022 Anticrm Platform Contributors.
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
  import { IconClose, Label, Icon } from '@anticrm/ui'

  import { getIssueFilterAssetsByType } from '../utils'
  import tracker from '../plugin'

  export let type: string = ''
  export let mode: '$in' | '$nin' = '$in'
  export let selectedFilters: any[] = []
  export let onDelete: () => void
  export let onChangeMode: () => void
  export let onEditFilter: (event: MouseEvent) => void

  $: item = getIssueFilterAssetsByType(type)
</script>

{#if item}
  <div class="filter-section">
    <button class="filter-button left-round">
      <div class="btn-icon mr-1-5">
        <Icon icon={item.icon} size={'x-small'} />
      </div>
      <span><Label label={item.label} /></span>
    </button>
    <button class="filter-button" on:click={onChangeMode}>
      <span>
        <Label
          label={mode === '$nin'
            ? tracker.string.FilterIsNot
            : selectedFilters.length < 2
            ? tracker.string.FilterIs
            : tracker.string.FilterIsEither}
          on:click={onChangeMode}
        />
      </span>
    </button>
    <button class="filter-button" on:click={onEditFilter}>
      <span>
        <Label label={tracker.string.FilterStatesCount} params={{ value: selectedFilters.length }} />
      </span>
    </button>
    <button class="filter-button right-round" on:click={onDelete}>
      <div class="btn-icon"><Icon icon={IconClose} size={'small'} /></div>
    </button>
  </div>
{/if}

<style lang="scss">
  .filter-section {
    display: flex;
    align-items: center;
    margin-bottom: 0.375rem;

    &:not(:last-child) {
      margin-right: 0.375rem;
    }
  }

  .filter-button {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    margin-right: 1px;
    padding: 0 0.375rem;
    font-size: 0.75rem;
    height: 1.5rem;
    min-width: 1.5rem;
    white-space: nowrap;
    color: var(--accent-color);
    background-color: var(--noborder-bg-color);
    border: 1px solid transparent;
    transition-property: border, background-color, color, box-shadow;
    transition-duration: 0.15s;

    .btn-icon {
      color: var(--content-color);
      transition: color 0.15s;
      pointer-events: none;
    }
    span {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 10rem;
    }
    &:hover {
      color: var(--caption-color);
      background-color: var(--noborder-bg-hover);

      .btn-icon {
        color: var(--caption-color);
      }
    }

    &.left-round {
      border-radius: 0.25rem 0 0 0.25rem;
    }
    &.right-round {
      border-radius: 0 0.25rem 0.25rem 0;
    }
    &:last-child {
      margin-right: 0;
    }
  }
</style>
