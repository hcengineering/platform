<!--
//
// Copyright © 2023, 2024 Hardcore Engineering Inc.
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
  import textEditor, { Heading } from '@hcengineering/text-editor'

  export let items: Heading[] = []
  export let selected: Heading | undefined = undefined
  export let enumerated: boolean = false

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
      <Label label={textEditor.string.TableOfContents} />
    </span>
  </div>
</div>
<div class="scroll">
  <div class="box" class:enumerated>
    {#each items as item}
      {@const level = getIndentLevel(item.level)}
      <button
        class="menu-item no-focus flex-row-center item enum{level + 1}"
        on:click={() => dispatch('close', item)}
        use:tooltip={{ label: getEmbeddedLabel(item.title) }}
      >
        <div
          class="label overflow-label flex-grow"
          class:selected={item.id === selected?.id}
          style={`padding-left: ${level * 1.5}rem;`}
        >
          {item.title}
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

  .enumerated {
    .enum1 {
      counter-increment: enum1;
      counter-reset: enum2;

      .label::before {
        content: counter(enum1) '. ';
      }
    }

    .enum2 {
      counter-increment: enum2;
      counter-reset: enum3;

      .label::before {
        content: counter(enum1) '.' counter(enum2) '. ';
      }
    }

    .enum3 {
      counter-increment: enum3;

      .label::before {
        content: counter(enum1) '.' counter(enum2) '.' counter(enum3) '. ';
      }
    }
  }
</style>
