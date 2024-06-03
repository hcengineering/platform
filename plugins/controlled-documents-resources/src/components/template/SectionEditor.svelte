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
  import { Doc, Mixin, Ref } from '@hcengineering/core'
  import presentation, {
    AttributesBar,
    KeyedAttribute,
    getClient,
    getFiltredKeys,
    isCollectionAttr
  } from '@hcengineering/presentation'
  import { Button, Component, EditBox, IconMoreH } from '@hcengineering/ui'
  import documents, { Document, DocumentTemplateSection } from '@hcengineering/controlled-documents'
  import documentsResources from '../../plugin'
  import {
    $collapsedDocumentSectionIds as collapsedSectionIds,
    documentSectionToggled
  } from '../../stores/editors/document'
  import FieldSectionEditor from '../FieldSectionEditor.svelte'
  import { showMenu } from '@hcengineering/view-resources'

  export let value: DocumentTemplateSection
  export let index: number
  export let document: Document
  export let readonly = false
  export let withEditing = false

  let editing = !withEditing

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: editor = hierarchy.as(hierarchy.getClass(value._class), documents.mixin.DocumentSectionEditor)?.editor

  $: classLabel = hierarchy.getClass(value._class).label

  async function updateTitle () {
    await client.update(value, { title: value.title.trim() })
  }

  function getSectionMixinKeys (mixin: Ref<Mixin<Doc>>, ignoreKeys?: string[]): KeyedAttribute[] {
    const filtredKeys = getFiltredKeys(hierarchy, mixin, [], documents.class.DocumentSection)

    return filtredKeys.filter((ka) => !isCollectionAttr(hierarchy, ka) && !ignoreKeys?.includes(ka.key))
  }
</script>

<FieldSectionEditor
  editable={!readonly}
  sectionType={classLabel}
  expanded={!$collapsedSectionIds.has(value._id)}
  on:toggle={() => documentSectionToggled(value._id)}
>
  <svelte:fragment slot="index">
    {index + 1}
  </svelte:fragment>
  <svelte:fragment slot="header">
    <div class="flex">
      -&nbsp;
      <div class="mr-2" style="overflow: hidden">
        <EditBox
          bind:value={value.title}
          fullSize
          disabled={readonly || !editing}
          placeholder={documentsResources.string.TemplateSectionTitle}
          kind="editbox"
          on:blur={updateTitle}
        />
      </div>
      {#if withEditing}
        <div class="mr-1">
          <Button
            kind="regular"
            label={editing ? presentation.string.Save : documentsResources.string.EditMode}
            on:click={() => (editing = !editing)}
          />
        </div>
      {/if}
    </div>
  </svelte:fragment>
  <svelte:fragment slot="content">
    {#if editor}
      <div class="flex flex-grow">
        <div class="mr-2 flex-grow">
          <Component is={editor} props={{ value, document, editable: !readonly && editing }} />
        </div>
        {#if !readonly}
          <div class="mt-3 left-divider px-3 max-w-85">
            <AttributesBar
              object={value}
              _class={documents.mixin.DocumentTemplateSection}
              keys={getSectionMixinKeys(documents.mixin.DocumentTemplateSection, ['title'])}
              readonly={!editing}
            />
          </div>
        {/if}
      </div>
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="tools">
    {#if !readonly}
      <Button
        icon={IconMoreH}
        kind="ghost"
        size={'medium'}
        on:click={(evt) => {
          showMenu(evt, value)
        }}
      />
    {/if}
  </svelte:fragment>
</FieldSectionEditor>
