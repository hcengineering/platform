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
  import { Class, Doc, Ref } from '@anticrm/core'
  import { Button, eventToHTMLElement, IconClose, showPopup, Icon, Label } from '@anticrm/ui'
  import { Filter } from '@anticrm/view'
  import { createEventDispatcher } from 'svelte'
  import view from '../../plugin'

  export let _class: Ref<Class<Doc>>
  export let filter: Filter
  let current = 0

  const dispatch = createEventDispatcher()

  function toggle () {
    const modes = filter.modes.filter((p) => p.isAvailable(filter.value))
    current++
    filter.mode = modes[current % modes.length]
    dispatch('change')
  }

  function onChange (e: Filter | undefined) {
    filter = filter
    dispatch('change')
  }
</script>

<div class="filter-section">
  <button class="filter-button left-round">
    {#if filter.key.icon}
      <div class="btn-icon mr-1-5">
        <Icon icon={filter.key.icon} size={'x-small'} />
      </div>
    {/if}
    <span><Label label={filter.key.label} /></span>
  </button>
  <button class="filter-button" on:click={toggle}>
    <span><Label label={filter.mode.label} /></span>
  </button>
  <button
    class="filter-button"
    on:click={(e) => {
      showPopup(
        filter.key.component,
        {
          _class,
          filter,
          onChange
        },
        eventToHTMLElement(e)
      )
    }}
  >
    <span>
      <Label label={view.string.FilterStatesCount} params={{ value: filter.value.length }} />
    </span>
  </button>
  <button class="filter-button right-round" on:click={() => { dispatch('remove') }}>
    <div class="btn-icon"><Icon icon={IconClose} size={'small'} /></div>
  </button>
</div>

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
