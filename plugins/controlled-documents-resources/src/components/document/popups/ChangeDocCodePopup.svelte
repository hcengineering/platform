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
  import documents, { ControlledDocument } from '@hcengineering/controlled-documents'
  import presentation, { createQuery, getClient } from '@hcengineering/presentation'
  import { Button, EditBox, Label } from '@hcengineering/ui'

  import IconWarning from '../../icons/IconWarning.svelte'
  import documentsRes from '../../../plugin'
  import { syncDocumentMetaTitle } from '../../../utils'

  export let object: ControlledDocument

  const client = getClient()
  const dispatch = createEventDispatcher()
  let code = object.code

  const docCodesQuery = createQuery()
  let docCodes: Record<string, string> = {}
  docCodesQuery.query(
    documents.class.Document,
    {},
    (res) => {
      docCodes = {}
      for (const doc of res) {
        if (doc._id === object._id || doc.code === '' || doc.code === undefined) {
          continue
        }

        docCodes[doc.code] = doc.title
      }
    },
    {
      projection: { code: 1, title: 1 }
    }
  )

  $: isUnique = code != null && docCodes[code] === undefined
  $: isFilled = code != null && code !== ''
  $: isSame = object.code === code
  $: canSubmit = isFilled && isUnique && !isSame

  async function handleSubmit (): Promise<void> {
    if (!canSubmit) {
      return
    }

    await client.update(object, { code })
    await syncDocumentMetaTitle(client, object.attachedTo, code, object.title)
    dispatch('close')
  }
</script>

{#if object}
  <div class="text-editor-popup min-w-112">
    <div class="p-6 bottom-divider">
      <div class="text-base font-medium primary-text-color pb-2">
        <Label label={documentsRes.string.ChangeCode} />
      </div>
      <div class="flex-column flex-gap-8 pt-6">
        <EditBox
          autoFocus
          placeholder={documentsRes.string.DocumentCodePlaceholder}
          bind:value={code}
          kind="large-style"
        />
        {#if !isUnique}
          <div class="error">
            <IconWarning size="small" />
            <Label label={documentsRes.string.CodeInUse} />
            <span class="name">{docCodes[code]}</span>
          </div>
        {/if}
      </div>
    </div>

    <div class="flex justify-end items-center flex-gap-2 pr-6 pl-6 pt-4 pb-4">
      <Button kind="regular" label={presentation.string.Cancel} on:click={() => dispatch('close')} />
      <Button kind="primary" disabled={!canSubmit} label={presentation.string.Change} on:click={handleSubmit} />
    </div>
  </div>
{/if}

<style lang="scss">
  .primary-text-color {
    color: var(--theme-text-primary-color);
  }

  .error {
    display: flex;
    gap: 0.25rem;
    margin-top: 0.375rem;
    color: var(--negative-button-default);
    font-size: 0.75rem;
    line-height: 1rem;
  }

  .name {
    font-weight: 500;
  }
</style>
