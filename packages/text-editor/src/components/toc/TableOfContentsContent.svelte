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
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { FocusHandler, Label, createFocusManager, tooltip } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import textEditorPlugin from '../../plugin'
  import { Heading } from '../../types'

  export let items: Heading[] = []
  export let selected: Heading | undefined = undefined

  $: minLevel = items.reduce((p, v) => Math.min(p, v.level), Infinity)

  function getIndentLevel (level: number): number {
    return 1 * (level - minLevel)
  }

  const dispatch = createEventDispatcher()
  const manager = createFocusManager()
</script>

<FocusHandler {manager} />

<div class="header">
  <div class="m-2">
    <span class="fs-title overflow-label title">
      <Label label={textEditorPlugin.string.TableOfContents} />
    </span>
  </div>
</div>
<div class="scroll">
  <div class="box">
    {#each items as item}
      {@const level = getIndentLevel(item.level)}
      <button
        class="menu-item no-focus flex-row-center item"
        on:click={() => dispatch('close', item)}
        use:tooltip={{ label: getEmbeddedLabel(item.title) }}
      >
        <div class="label overflow-label flex-grow" class:selected={item.id === selected?.id}>
          <span style={`padding-left: ${level * 1.5}rem;`}>
            {item.title}
          </span>
        </div>
      </button>
    {/each}
  </div>
</div>

<style lang="scss">
  .selected {
    color: var(--theme-primary-default);
  }

  .title {
    margin: 0 0.5rem;
    @media print {
      line-height: 3rem;
      margin-left: 0;
    }
  }

  .item {
    @media print {
      line-height: 2rem;
    }
  }
</style>
