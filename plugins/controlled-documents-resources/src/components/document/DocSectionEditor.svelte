<!--
// Copyright © 2022-2023 Hardcore Engineering Inc.
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
  import chunter from '@hcengineering/chunter'
  import { getClient } from '@hcengineering/presentation'
  import { Heading, isEmptyMarkup } from '@hcengineering/text-editor'
  import { Button, Component, EditBox } from '@hcengineering/ui'
  import documents, { Document, DocumentSection, DocumentTemplateSection } from '@hcengineering/controlled-documents'

  import Info from '../icons/Info.svelte'
  import {
    $documentCommentHighlightedLocation as highlighted,
    $canAddDocumentComments as canAddDocumentComments,
    $canViewDocumentComments as canViewDocumentComments,
    $collapsedDocumentSectionIds as collapsedSectionIds,
    $documentSectionEditingDescription as documentSectionEditingDescription,
    $groupedDocumentComments as groupedDocumentComments,
    $isEditable as isEditable,
    documentCommentsDisplayRequested,
    documentSectionToggled,
    showAddCommentPopupFx,
    updateDocumentSectionDescriptionFx
  } from '../../stores/editors/document'
  import { openGuidanceEditor } from '../../utils'
  import FieldSectionEditor from '../FieldSectionEditor.svelte'
  import DescriptionEditor from './editors/DescriptionEditor.svelte'

  export let document: Document
  export let value: DocumentSection
  export let index: number
  export let dragging = false

  export let headings: Heading[] = [] // out

  const client = getClient()

  const h = client.getHierarchy()

  $: editor = h.as(h.getClass(value._class), documents.mixin.DocumentSectionEditor)?.editor

  let sectionHasGuidance = false
  let templateSection: DocumentTemplateSection | undefined
  $: getDocumentTemplateSection(value)
  async function getDocumentTemplateSection (section: DocumentSection) {
    if (h.hasMixin(value, documents.mixin.DocumentTemplateSection)) {
      templateSection = h.as(value, documents.mixin.DocumentTemplateSection)
    } else if (value.templateSectionId != null) {
      templateSection = await client.findOne(documents.mixin.DocumentTemplateSection, { _id: value.templateSectionId })
    }

    if (templateSection) {
      const guidance = templateSection.guidance
      sectionHasGuidance = !isEmptyMarkup(guidance)
    }
  }

  let contentHeadings: Heading[] = []
  $: sectionHeading = makeSectionHeading(value, index)
  $: headings = [sectionHeading, ...contentHeadings]

  function handleSectionContentHeadings (headings: Heading[]): void {
    contentHeadings = headings
  }

  function makeSectionHeading (section: DocumentSection, index: number): Heading {
    index = index + 1
    const id = `section-${index}`
    const title = `${index}. ${section.title}`
    return { id, title, level: 0 }
  }

  async function handleOpenAddCommentPopup (ev?: Event): Promise<void> {
    if (!$canAddDocumentComments) {
      return
    }

    await showAddCommentPopupFx({
      element: (ev as MouseEvent).target as HTMLElement,
      sectionKey: value.key
    })
  }

  function handleDisplayDocumentComments (ev?: Event): void {
    if (!$canViewDocumentComments) {
      return
    }
    if (!$groupedDocumentComments.hasDocumentComments(value.key)) {
      return
    }

    ev?.stopPropagation()

    documentCommentsDisplayRequested({ element: (ev as MouseEvent).target as HTMLElement, sectionKey: value.key })
  }

  async function updateSectionTitle (title: string) {
    await client.update(value, { title })
  }

  let sectionElement: HTMLElement
  export function getSectionElement (): HTMLElement {
    return sectionElement
  }

  let title = value.title

  let descr = ''
  $: getDescription(templateSection)
  $: isActiveSectionNode = !!$highlighted && $highlighted.sectionKey === value.key && !$highlighted.nodeId
  function getDescription (section?: DocumentTemplateSection) {
    if (section != null) {
      descr = h.as(section, documents.mixin.DocumentTemplateSection).description ?? ''
    }
  }

  $: isEditingDescription = $documentSectionEditingDescription === value._id

  async function stopEditingDescription () {
    if (!templateSection) {
      return
    }
    updateDocumentSectionDescriptionFx({ section: templateSection, description: descr })
  }

  function showGuidance (ev: MouseEvent) {
    if (templateSection == null) {
      return
    }

    const isEditingTemplate = templateSection._id === value._id
    openGuidanceEditor(client, templateSection, index + 1, isEditingTemplate ? 'canEdit' : 'readonly', ev)
  }
</script>

<FieldSectionEditor
  editable={$isEditable}
  expanded={!$collapsedSectionIds.has(value._id)}
  on:toggle={() => documentSectionToggled(value._id)}
>
  <svelte:fragment slot="before-header">
    <slot name="before-header" />
  </svelte:fragment>
  <svelte:fragment slot="index">
    {index + 1}
  </svelte:fragment>
  <svelte:fragment slot="header">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      id={sectionHeading.id}
      class:text-editor-highlighted-node-warning={isActiveSectionNode ||
        $groupedDocumentComments.hasDocumentComments(value.key)}
      class:text-editor-highlighted-node-selected={isActiveSectionNode}
      bind:this={sectionElement}
      on:click={handleDisplayDocumentComments}
    >
      {#if $isEditable && !dragging}
        <EditBox maxWidth="100%" bind:value={title} propagateClick on:change={() => updateSectionTitle(title)} />
      {:else}
        {title}
      {/if}
    </div>
  </svelte:fragment>
  <svelte:fragment slot="header-extra">
    <div class="flex-row-center ml-2 mr-10">
      {#if $canAddDocumentComments}
        <Button icon={chunter.icon.Chunter} kind="list-header" size="small" on:click={handleOpenAddCommentPopup} />
      {/if}
      {#if templateSection && sectionHasGuidance}
        <Button icon={Info} kind="list-header" size="small" on:click={showGuidance} />
      {/if}
    </div>
  </svelte:fragment>
  <svelte:fragment slot="before-content">
    {#if isEditingDescription || descr.length > 0}
      <div class="section-descr no-print">
        <DescriptionEditor bind:value={descr} disabled={!isEditingDescription} on:blur={stopEditingDescription} />
      </div>
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="content">
    <Component
      is={editor}
      props={{
        value,
        document,
        onHeadings: handleSectionContentHeadings
      }}
      on:change
    />
  </svelte:fragment>
</FieldSectionEditor>
