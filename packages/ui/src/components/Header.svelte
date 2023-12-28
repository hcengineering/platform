<!--
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
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { IconMaximize, IconMinimize } from '..'

  export let minimize: boolean = false

  const dispatch = createEventDispatcher()
</script>

<div class="hulyHeader-container">
  <button class="hulyHeader-button" on:click={() => dispatch('resize', minimize)}>
    {#if minimize}
      <IconMinimize size={'small'} />
    {:else}
      <IconMaximize size={'small'} />
    {/if}
  </button>
  <div class="hulyHeader-divider" />
  <div class="hulyHeader-titleGroup">
    <slot />
  </div>
  {#if $$slots.actions}
    <div class="hulyHeader-buttonsGroup">
      <slot name="actions" />
    </div>
  {/if}
</div>

<style lang="scss">
  .hulyHeader-container {
    display: flex;
    align-items: center;
    padding: var(--spacing-1_5) var(--spacing-2);
    width: 100%;
    height: var(--spacing-6_5);
    border-bottom: 1px solid var(--theme-divider-color); // var(--global-surface-02-BorderColor);

    .hulyHeader-button {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-shrink: 0;
      padding: 0;
      width: 1.5rem;
      height: 1.5rem;
      color: var(--button-disabled-IconColor);
      cursor: pointer;

      &:hover {
        color: var(--button-subtle-LabelColor);
      }
    }
    .hulyHeader-divider {
      flex-shrink: 0;
      margin: 0 var(--spacing-2);
      width: 1px;
      height: var(--spacing-4);
      background-color: var(--theme-divider-color); // var(--global-surface-02-BorderColor);
    }
    .hulyHeader-titleGroup,
    .hulyHeader-buttonsGroup {
      display: flex;
      align-items: center;
      min-width: 0;
    }
    .hulyHeader-titleGroup {
      flex-grow: 1;
      gap: var(--spacing-0_5);
    }
    .hulyHeader-buttonsGroup {
      gap: var(--spacing-1);
      margin-left: var(--spacing-2);
    }
  }
</style>
