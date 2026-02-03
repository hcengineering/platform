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
  import { Html, Modal, ButtonIcon, IconClose, IconMaximize, IconMinimize, Scroller } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  export let svg: string
  export let fullSize = false

  const dispatch = createEventDispatcher()
</script>

<Modal type={'type-component'} padding={'0.5rem'} bottomPadding={'0'} on:fullsize on:close>
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

  <Scroller horizontal stickedScrollBars thinScrollBars>
    <div class="mermaid-container">
      <Html value={svg} />
    </div>
  </Scroller>
</Modal>

<style>
  .mermaid-container {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    width: 100%;
  }

  .mermaid-container :global(svg) {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 0 auto;
  }
</style>
