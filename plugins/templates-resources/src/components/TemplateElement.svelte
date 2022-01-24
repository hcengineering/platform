<!--
// Copyright © 2021 Anticrm Platform Contributors.
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
  import { Doc } from '@anticrm/core'
  import { IconMoreV, showPopup } from '@anticrm/ui'
  import { ContextMenu } from '@anticrm/view-resources'
  import { createEventDispatcher } from 'svelte'

  export let label: string = ''
  export let active: boolean = false
  export let object: Doc | undefined

  const dispatch = createEventDispatcher()

  const showMenu = async (ev: MouseEvent, object?: Doc): Promise<void> => {
    if (object !== undefined) {
      showPopup(ContextMenu, { object }, ev.target as HTMLElement)
    }
  }

</script>

<!-- svelte-ignore a11y-mouse-events-have-key-events -->
<div
  class="flex-row-center container" class:active={active}
  on:click|stopPropagation={() => {
    dispatch('click')
  }}
>
  <span>
    {label}
  </span>
  {#if object}
    <div class="menuRow" on:click={(ev) => showMenu(ev, object)}><IconMoreV size={'small'} /></div>
  {/if}
</div>

<style lang="scss">
  .container {
    min-height: 36px;
    font-weight: 500;
    color: var(--theme-caption-color);
    border-radius: 8px;
    user-select: none;
    cursor: pointer;

    span {
      flex-grow: 1;
      margin-left: 1rem;
      margin-right: 1rem;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    &.active {
      background-color: var(--theme-button-bg-enabled);
    }

    &:hover {
      background-color: var(--theme-button-bg-enabled);
      .menuRow {
        visibility: visible;
      }
    }
  }
  .menuRow {
    visibility: hidden;
    margin-left: 0.5rem;
    opacity: 0.6;
    cursor: pointer;
    &:hover {
      opacity: 1;
    }
  }
</style>
