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
      class="flex-between flex-nowrap item mb-2"
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
      <div class="flex">
        <div class="circles-mark"><IconCircles /></div>
        <span class="overflow-label">{item}</span>
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
</Scroller>
{#if filtered.length === 0}
  <Label label={presentation.string.NoMatchesFound} />
{/if}

<style lang="scss">
  .item {
    &:hover {
      .circles-mark {
        cursor: grab;
        opacity: 1;
      }
    }
  }
  .circles-mark {
    position: relative;
    opacity: 0.4;
    width: 0.375rem;
    height: 1rem;
    transition: opacity 0.1s;
    margin-right: 0.5rem;
    cursor: grab;

    &::before {
      position: absolute;
      content: '';
      inset: -0.5rem;
    }
  }
</style>
