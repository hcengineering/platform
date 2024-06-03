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
  import type { Class, Doc, DocumentQuery, FindOptions, Ref } from '@hcengineering/core'
  import type { Asset, IntlString } from '@hcengineering/platform'
  import presentation, { getClient, ObjectCreate, ObjectPopup } from '@hcengineering/presentation'
  import { AnySvelteComponent, Label } from '@hcengineering/ui'
  import { ObjectPresenter } from '@hcengineering/view-resources'
  import documents, { type Document } from '@hcengineering/controlled-documents'

  export let _class: Ref<Class<Document>>
  export let options: FindOptions<Document> | undefined = undefined
  export let selected: Ref<Document> | undefined
  export let docQuery: DocumentQuery<Document> | undefined = undefined
  export let multiSelect: boolean = false
  export let allowDeselect: boolean = false
  export let titleDeselect: IntlString | undefined = undefined
  export let placeholder: IntlString = presentation.string.Search
  export let selectedDocuments: Ref<Document>[] = []
  export let ignoreDocuments: Ref<Document>[] = []
  export let shadows: boolean = true
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let create: ObjectCreate | undefined = undefined
  export let readonly = false

  const hierarchy = getClient().getHierarchy()
  const dispatch = createEventDispatcher()

  $: _create =
    create !== undefined
      ? {
          ...create,
          update: (doc: Doc) => {
            return (doc as Document).title
          }
        }
      : undefined
</script>

<!-- TODO: change searchMode to fulltext when search is configured for documents -->
<ObjectPopup
  {_class}
  {options}
  {selected}
  {multiSelect}
  {allowDeselect}
  {titleDeselect}
  {placeholder}
  docQuery={readonly ? { ...docQuery, _id: { $in: selectedDocuments } } : docQuery}
  groupBy="_class"
  searchField="title"
  bind:selectedObjects={selectedDocuments}
  bind:ignoreObjects={ignoreDocuments}
  {shadows}
  create={_create}
  on:update
  on:close
  on:changeContent
  on:created={(doc) => dispatch('close', doc.detail)}
  {readonly}
>
  <svelte:fragment slot="item" let:item={doc}>
    <div class="flex flex-grow overflow-label">
      <ObjectPresenter
        objectId={doc._id}
        _class={documents.class.Document}
        props={{ withIcon: true, withTitle: true, isRegular: true, disableLink: true }}
      />
    </div>
  </svelte:fragment>

  <svelte:fragment slot="category" let:item={doc}>
    {@const cl = hierarchy.getClass(doc._class)}
    <div class="menu-group__header">
      <span class="overflow-label">
        <Label label={cl.label} />
      </span>
    </div>
  </svelte:fragment>
</ObjectPopup>
