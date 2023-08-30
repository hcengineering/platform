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
  import presentation from '@hcengineering/presentation'
  import { ActionIcon, IconCircles, IconDelete, Label, Scroller } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import setting from '../plugin'

  export let values: string[]
  export let filtered: string[]

  let selected: string | undefined
  const elements: HTMLElement[] = []

  function dragswap (ev: MouseEvent, item: string): boolean {
    const s = filtered.findIndex((p) => p === selected)
    const i = filtered.findIndex((p) => p === item)
    if (i < s) {
      return ev.offsetY < elements[i].offsetHeight / 2
    } else if (i > s) {
      return ev.offsetY > elements[i].offsetHeight / 2
    }
    return false
  }

  function dragover (ev: MouseEvent, item: string) {
    const s = values.findIndex((p) => p === selected)
    const i = values.findIndex((p) => p === item)
    if (dragswap(ev, item)) {
      ;[values[i], values[s]] = [values[s], values[i]]
    }
  }

  const dispatch = createEventDispatcher()

  async function remove (target: string) {
    dispatch('remove', target)
  }

  async function onDrop () {
    dispatch('drop')
  }
</script>

<Scroller>
  {#each filtered as item, i}
    <div
      class="flex-between flex-nowrap item step-tb25"
      draggable={true}
      bind:this={elements[i]}
      on:dragover|preventDefault={(ev) => {
        dragover(ev, item)
      }}
      on:drop|preventDefault={onDrop}
      on:dragstart={() => {
        selected = item
      }}
      on:dragend={() => {
        selected = undefined
      }}
    >
      <div class="flex-row-center">
        <div class="circles-mark"><IconCircles size={'small'} /></div>
        <span class="overflow-label mx-2">{item}</span>
      </div>
      <ActionIcon
        icon={IconDelete}
        label={setting.string.Delete}
        action={() => {
          remove(item)
        }}
        size={'small'}
      />
    </div>
  {/each}
  {#if filtered.length}<div class="antiVSpacer x4" />{/if}
</Scroller>
{#if filtered.length === 0}
  <Label label={presentation.string.NoMatchesFound} />
{/if}

<style lang="scss">
  .item {
    padding: 0.5rem 0.5rem 0.5rem 0.125rem;
    height: 2.25rem;
    background-color: var(--theme-button-default);
    border-radius: 0.25rem;

    .circles-mark {
      position: relative;
      width: 1rem;
      height: 1rem;
      opacity: 0.4;
      transition: opacity 0.1s;
      cursor: grab;

      &::before {
        position: absolute;
        content: '';
        inset: -0.5rem;
      }
    }
    &:hover {
      background-color: var(--theme-button-hovered);

      .circles-mark {
        cursor: grab;
        opacity: 1;
      }
    }
    &:active {
      background-color: var(--theme-button-pressed);
    }
  }
</style>
