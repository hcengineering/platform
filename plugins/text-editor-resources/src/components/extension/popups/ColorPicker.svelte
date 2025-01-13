<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { createEventDispatcher } from 'svelte'
  import { Card } from '@hcengineering/presentation'

  export let palette: Array<{ color: string, preview?: string }> = [{ color: 'transparent' }]

  const dispatch = createEventDispatcher()

  function handleSubmit (color: { color: string }): void {
    dispatch('close', color)
  }
</script>

<div class="picker">
  <div class="palette">
    {#each palette as k}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="colorBox"
        style:background-color={k.preview ?? k.color}
        on:click={() => {
          handleSubmit(k)
        }}
      />
    {/each}
  </div>
</div>

<style lang="scss">
  .picker {
    background: var(--theme-popup-color);
    border-radius: 0.5rem;
    box-shadow: var(--theme-popup-shadow);
    padding: 0.5rem;
    margin-left: -4rem;
  }

  .palette {
    display: flex;
    gap: 0.25rem;
  }

  .colorBox {
    position: relative;
    width: 1.5rem;
    height: 1.5rem;
    border: 1px solid var(--theme-button-border);
    cursor: pointer;
  }
</style>
