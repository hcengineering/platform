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
  import { translate } from '@hcengineering/platform'
  import documents, { DocumentTemplate, TEMPLATE_PREFIX } from '@hcengineering/controlled-documents'
  import presentation, { createQuery, getClient } from '@hcengineering/presentation'
  import { Button, EditBox, Label } from '@hcengineering/ui'

  import IconWarning from '../../icons/IconWarning.svelte'
  import documentsRes from '../../../plugin'

  export let object: DocumentTemplate

  const dispatch = createEventDispatcher()
  const client = getClient()
  let prefix = object.docPrefix

  let templatesCodeTitle = ''
  translate(documents.string.SysTemplate, {}).then(
    (res) => {
      templatesCodeTitle = res
      templateDocPrefixes[TEMPLATE_PREFIX] = templatesCodeTitle
    },
    (err) => {
      console.warn(`Cannot load translation for: ${documents.string.SysTemplate}. Error: ${err})`)
    }
  )

  const templateDocPrefixesQuery = createQuery()
  let templateDocPrefixes: Record<string, string> = {}
  templateDocPrefixesQuery.query(
    documents.mixin.DocumentTemplate,
    { _id: { $ne: object._id } },
    (res) => {
      templateDocPrefixes = { [TEMPLATE_PREFIX]: templatesCodeTitle }
      for (const t of res) {
        templateDocPrefixes[t.docPrefix] = t.title
      }
    },
    {
      projection: { docPrefix: 1, title: 1 }
    }
  )

  $: isUnique = prefix != null && templateDocPrefixes[prefix] === undefined
  $: isFilled = prefix != null && prefix !== ''
  $: isSame = object.docPrefix === prefix
  $: canSubmit = isFilled && isUnique && !isSame

  async function handleSubmit (): Promise<void> {
    if (!canSubmit) {
      return
    }

    await client.updateMixin(object._id, documents.class.Document, object.space, documents.mixin.DocumentTemplate, {
      docPrefix: prefix
    })
    dispatch('close')
  }
</script>

{#if object}
  <div class="text-editor-popup min-w-112">
    <div class="p-6 bottom-divider">
      <div class="text-base font-medium primary-text-color pb-2">
        <Label label={documentsRes.string.ChangePrefix} />
      </div>
      <div class="flex-column center flex-gap-8 pt-6">
        <EditBox
          autoFocus
          placeholder={documentsRes.string.DocumentPrefixPlaceholder}
          bind:value={prefix}
          kind="large-style"
        />
        {#if !isUnique}
          <div class="error">
            <IconWarning size="small" />
            <Label label={documentsRes.string.CodeInUse} />
            <span class="name">{templateDocPrefixes[prefix]}</span>
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
