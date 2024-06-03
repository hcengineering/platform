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
  import documents, { DocumentCategory } from '@hcengineering/controlled-documents'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { Button, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import Info from '../../icons/Info.svelte'
  import { canDeleteDocumentCategory } from '../../../utils'

  export let object: DocumentCategory

  let canDelete = false

  const client = getClient()
  const dispatch = createEventDispatcher()

  const handleDelete = async (): Promise<void> => {
    if (!canDelete) {
      return
    }

    await client.remove(object)
    dispatch('close', object)
  }

  $: void checkDeletePosibility(object)
  async function checkDeletePosibility (category: DocumentCategory): Promise<void> {
    canDelete = await canDeleteDocumentCategory(category)
  }
</script>

{#if object}
  <div class="text-editor-popup min-w-100">
    <div class="p-6 bottom-divider">
      <div class="text-base font-medium pb-2">
        <Label label={documents.string.DeleteCategory} />
      </div>
      {#if canDelete}
        <div class="hint text-sm">
          <Label label={documents.string.DeleteCategoryHint} />
        </div>
      {/if}
      {#if !canDelete}
        <div class="warning flex flex-gap-1 p-1 text-xs">
          <Info size="small" />
          <Label label={documents.string.DeleteCategoryWarning} />
        </div>
      {/if}
    </div>

    <div class="flex justify-end items-center flex-gap-2 p-6">
      <Button kind="regular" label={presentation.string.Cancel} on:click={() => dispatch('close')} />
      <Button kind="dangerous" disabled={!canDelete} label={presentation.string.Delete} on:click={handleDelete} />
    </div>
  </div>
{/if}

<style lang="scss">
  .hint {
    color: var(--theme-dark-color);
  }

  .warning {
    background-color: var(--theme-docs-warning-color);
    border-radius: 0.375rem;
  }
</style>
