<!--
//
// Copyright © 2026 Hardcore Engineering Inc.
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
  import { Modal, ButtonIcon, IconClose, IconMaximize, IconMinimize } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  export let svg: string
  export let fullSize = false

  const dispatch = createEventDispatcher()
</script>

<Modal type={'type-component'} scrollableContent={false} on:fullsize on:close>
  <svelte:fragment slot="beforeTitle">
    <ButtonIcon
      icon={IconClose}
      kind={'tertiary'}
      size={'small'}
      noPrint
      on:click={() => {
        dispatch('close')
      }}
    />
    <div class="hulyHeader-divider short no-line no-print" />
    <ButtonIcon
      icon={!fullSize ? IconMaximize : IconMinimize}
      kind={'tertiary'}
      size={'small'}
      noPrint
      on:click={() => {
        fullSize = !fullSize
        dispatch('fullsize', fullSize)
      }}
    />
    <div class="hulyHeader-divider short no-print" />
  </svelte:fragment>

  <div class="mermaid-scroll">
    <div class="mermaid-center">
      <div class="mermaid-container">
        <!-- Mermaid renders SVG with securityLevel=antiscript; render as-is to preserve SVG text -->
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html svg}
      </div>
    </div>
  </div>
</Modal>

<style>
  .mermaid-scroll {
    width: 100%;
    height: 100%;
    padding: 0.5rem;
    overflow: auto;
    box-sizing: border-box;
    scrollbar-width: auto;
  }

  .mermaid-center {
    min-width: 100%;
    min-height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .mermaid-container {
    width: max-content;
    height: max-content;
  }

  .mermaid-container :global(svg) {
    width: auto;
    height: auto;
    max-width: none;
    max-height: none;
    display: block;
    margin: 0;
  }
</style>
