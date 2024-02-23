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
  import { IconMaximize, IconMinimize, IconClose, ButtonIcon } from '..'

  export let type: 'type-aside' | 'type-popup' | 'type-component' | 'type-panel' = 'type-component'
  export let minimize: boolean = false
  export let noResize: boolean = false
  export let hideSeparator: boolean = false

  const dispatch = createEventDispatcher()
</script>

<div class="hulyHeader-container" class:topIndent={type === 'type-panel'} class:hideSeparator>
  {#if type === 'type-component'}
    {#if !noResize}
      <button class="hulyHeader-button" on:click={() => dispatch('resize', minimize)}>
        {#if minimize}
          <IconMinimize size={'small'} />
        {:else}
          <IconMaximize size={'small'} />
        {/if}
      </button>
    {/if}
    <slot name="beforeTitle" />
    <div class="hulyHeader-divider" />
  {/if}
  <div class="hulyHeader-titleGroup">
    <slot />
  </div>
  {#if $$slots.actions}
    <div class="hulyHeader-buttonsGroup">
      <slot name="actions" />
    </div>
  {/if}
  {#if type === 'type-popup' || type === 'type-aside'}
    {#if type !== 'type-popup'}<div class="hulyHeader-divider" />{/if}
    <div class="hulyHotKey-item">Esc</div>
    <ButtonIcon icon={IconClose} kind={'tertiary'} size={'small'} on:click={() => dispatch('close')} />
  {/if}
</div>
