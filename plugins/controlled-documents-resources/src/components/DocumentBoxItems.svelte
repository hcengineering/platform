<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import type { Class, DocumentQuery, Ref } from '@hcengineering/core'
  import type { IntlString } from '@hcengineering/platform'
  import { Label, showPopup, ActionIcon, IconClose, IconAdd, Icon } from '@hcengineering/ui'
  import type { IconSize } from '@hcengineering/ui'
  import { ObjectPresenter } from '@hcengineering/view-resources'
  import documents, { type Document } from '@hcengineering/controlled-documents'

  import documentsRes from '../plugin'
  import DocumentsPopup from './DocumentsPopup.svelte'

  export let items: Ref<Document>[] = []
  export let readonlyItems = new Set<Ref<Document>>()
  export let _class: Ref<Class<Document>> = documents.class.Document
  export let docQuery: DocumentQuery<Document> | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let actionLabel: IntlString = documentsRes.string.AddDocument
  export let size: IconSize = 'x-small'
  export let width: string | undefined = undefined
  export let readonly: boolean = false

  $: fixedItems = readonly ? items : items.filter((item) => readonlyItems.has(item))
  $: editableItems = readonly ? [] : items.filter((item) => !readonlyItems.has(item))

  const dispatch = createEventDispatcher()

  async function addPerson (evt: Event): Promise<void> {
    showPopup(
      DocumentsPopup,
      {
        _class,
        label,
        docQuery,
        multiSelect: true,
        allowDeselect: false,
        selectedDocuments: items,
        ignoreDocuments: Array.of(readonlyItems),
        readonly
      },
      evt.target as HTMLElement,
      undefined,
      (result) => {
        if (result != null) {
          items = result
          dispatch('update', items)
        }
      }
    )
  }

  const removeDocument = (removed: Ref<Document>): void => {
    const newItems = items.filter((it) => it !== removed)

    dispatch('update', newItems)
  }
</script>

<div class="flex-col" style:width={width ?? 'auto'}>
  <div class="flex-row-center flex-wrap">
    {#each fixedItems as doc}
      <div class="doctag-container gap-1-5">
        <ObjectPresenter
          objectId={doc}
          _class={documents.class.Document}
          props={{ withIcon: true, withTitle: true, isRegular: true }}
        />
      </div>
    {/each}
    {#each editableItems as doc}
      <div class="doctag-container gap-1-5">
        <ObjectPresenter
          objectId={doc}
          _class={documents.class.Document}
          props={{ withIcon: true, withTitle: true, isRegular: true }}
        />
        <ActionIcon
          icon={IconClose}
          size={size === 'inline' ? 'x-small' : 'small'}
          action={() => {
            removeDocument(doc)
          }}
        />
      </div>
    {/each}
  </div>
  {#if !readonly}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="addButton {size === 'inline' ? 'small' : 'medium'} overflow-label gap-2 cursor-pointer"
      class:mt-2={items.length > 0}
      on:click={addPerson}
    >
      <span><Label label={actionLabel} /></span>
      <Icon icon={IconAdd} size={size === 'inline' ? 'x-small' : 'small'} fill={'var(--theme-dark-color)'} />
    </div>
  {/if}
</div>

<style lang="scss">
  .doctag-container {
    display: flex;
    align-items: center;
    margin: 0 0.5rem 0.5rem 0;
    padding: 0.375rem 0.625rem 0.375rem 0.5rem;
    background-color: var(--theme-button-default);
    border: 1px solid var(--theme-button-border);
    border-radius: 0.25rem;
  }
  .addButton {
    display: flex;
    align-items: center;
    font-weight: 500;
    color: var(--theme-dark-color);

    &.small {
      height: 0.875rem;
      font-size: 0.75rem;
      line-height: 0.75rem;
    }
    &.medium {
      height: 1.125rem;
    }
  }
</style>
