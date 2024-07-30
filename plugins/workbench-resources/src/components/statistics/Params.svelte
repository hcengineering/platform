<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { Button, FocusHandler, createFocusManager } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  export let params: Record<string, any>

  const dispatch = createEventDispatcher()

  const manager = createFocusManager()
</script>

<FocusHandler {manager} />

<div class="msgbox-container">
  <div class="overflow-label fs-title mb-4"></div>
  <div class="message no-word-wrap" style:overflow={'auto'}>
    {#each Object.entries(params) as kv}
      <div class="flex-row-center">
        {kv[0]}: {typeof kv[1] === 'object' ? JSON.stringify(kv[1]) : kv[1]}
      </div>
    {/each}
  </div>
  <div class="footer">
    <Button
      focus
      focusIndex={1}
      label={presentation.string.Ok}
      size={'large'}
      kind={'primary'}
      on:click={() => {
        dispatch('close', true)
      }}
    />
  </div>
</div>

<style lang="scss">
  .msgbox-container {
    display: flex;
    flex-direction: column;
    padding: 2rem 1.75rem 1.75rem;
    width: 30rem;
    max-width: 40rem;
    background: var(--theme-popup-color);
    border-radius: 0.5rem;
    user-select: none;
    box-shadow: var(--theme-popup-shadow);

    .message {
      margin-bottom: 1.75rem;
      color: var(--theme-content-color);
    }
    .footer {
      flex-shrink: 0;
      display: grid;
      grid-auto-flow: column;
      direction: rtl;
      justify-content: flex-start;
      align-items: center;
      column-gap: 0.5rem;
      // mask-image: linear-gradient(90deg, rgba(0, 0, 0, 0) 1.25rem, rgba(0, 0, 0, 1) 2.5rem);
      // overflow: hidden;
    }
  }
</style>
