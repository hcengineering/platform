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
  import { Icon, IconEdit, IconClose, tooltip, Button } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  export let isEditable = false
  export let isDeletable = false
  export let isEditing = false
  export let isSaving = false
  export let canSave = false

  const dispatch = createEventDispatcher()

  $: areButtonsVisible = isEditable || isDeletable || isEditing
</script>

<div
  class="root flex flex-between items-center w-full p-2"
  on:dblclick|preventDefault={isEditable && !isEditing ? () => dispatch('edit') : undefined}
>
  <div class="content w-full">
    <slot />
  </div>

  {#if areButtonsVisible}
    <div class="ml-auto pl-2 buttons-group small-gap flex-no-shrink">
      {#if isEditing}
        <Button label={presentation.string.Cancel} kind="secondary" on:click={() => dispatch('cancel')} />
        <Button
          label={presentation.string.Save}
          kind="primary"
          loading={isSaving}
          disabled={!canSave}
          on:click={() => dispatch('save')}
        />
      {:else}
        {#if isEditable}
          <button
            class="btn"
            use:tooltip={{ label: presentation.string.Edit }}
            on:click|preventDefault={() => dispatch('edit')}
          >
            <Icon icon={IconEdit} size="small" />
          </button>
        {/if}
        {#if isDeletable}
          <button
            class="btn"
            use:tooltip={{ label: presentation.string.Remove }}
            on:click|preventDefault={() => dispatch('delete')}
          >
            <Icon icon={IconClose} size="small" />
          </button>
        {/if}
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .root {
    overflow: hidden;

    &:hover {
      .btn {
        opacity: 1;
      }
    }
  }

  .content {
    overflow: hidden;
  }

  .btn {
    position: relative;
    opacity: 0;
    cursor: pointer;
    color: var(--content-color);
    transition: opacity 0.15s;

    &:hover {
      color: var(--caption-color);
    }

    &::before {
      position: absolute;
      content: '';
      inset: -0.5rem;
    }
  }
</style>
