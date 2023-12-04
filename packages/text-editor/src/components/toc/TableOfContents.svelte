<!--
//
// Copyright © 2023 Hardcore Engineering Inc.
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
//
-->
<script lang="ts">
  import { getPopupPositionElement, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import TableofContentsPopup from './TableOfContentsPopup.svelte'
  import { Heading } from '../../types'

  export let items: Heading[] = []
  export let selected: Heading | undefined = undefined

  const dispatch = createEventDispatcher()

  $: minLevel = items.reduce((p, v) => Math.min(p, v.level), Infinity)
  $: maxLevel = items.reduce((p, v) => Math.max(p, v.level), 0)

  function getLevelWidth (level: number): number {
    return (100 * (maxLevel - level + 1)) / (maxLevel - minLevel + 1)
  }

  let hovered = false

  function handleOpenToc (ev: MouseEvent): void {
    ev.preventDefault()
    ev.stopPropagation()

    hovered = true

    showPopup(
      TableofContentsPopup,
      { items, selected },
      getPopupPositionElement(ev.target as HTMLElement, { v: 'top', h: 'right' }),
      (res) => {
        hovered = false
        if (res != null) {
          dispatch('select', res)
        }
      }
    )
  }
</script>

<div class="root">
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="toc" class:hovered on:click={handleOpenToc}>
    {#each items as item}
      {@const width = getLevelWidth(item.level)}
      <div class="toc-item" class:selected={item.id === selected?.id} style={`width: ${width}%;`} />
    {/each}
  </div>
</div>

<style lang="scss">
  .root {
    display: inline-flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
    gap: 1.5rem;
  }

  .toc {
    width: 0.75rem;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
    gap: 0.625rem;
    overflow: hidden;

    .toc-item {
      display: inline-block;
      height: 0;
      border: 1px solid var(--text-editor-toc-default-color);

      &.selected {
        border: 1px solid var(--text-editor-toc-hovered-color);
      }
    }

    &:hover,
    &.hovered {
      cursor: pointer;
      .toc-item {
        border: 1px solid var(--text-editor-toc-hovered-color);
      }
    }
  }
</style>
