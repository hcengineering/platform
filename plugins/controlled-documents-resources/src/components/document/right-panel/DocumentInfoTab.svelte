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
  import documents, { DocumentState, type Document, type DocumentTemplate } from '@hcengineering/controlled-documents'
  import { PersonPresenter } from '@hcengineering/contact-resources'
  import { DateRangeMode } from '@hcengineering/core'
  import { DatePresenter, Label, Scroller, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'

  import documentsRes from '../../../plugin'
  import {
    $documentAllVersionsDescSorted as documentAllVersions,
    $controlledDocument as controlledDocument,
    $isEditable as isEditable,
    $projectRef as projectRef
  } from '../../../stores/editors/document'

  import CategoryPresenter from '../presenters/CategoryPresenter.svelte'
  import DocumentTitlePresenter from '../presenters/DocumentTitlePresenter.svelte'
  import DocumentVersionPresenter from '../presenters/DocumentVersionPresenter.svelte'
  import OwnerPresenter from '../presenters/OwnerPresenter.svelte'
  import StatePresenter from '../presenters/StatePresenter.svelte'
  import DocumentPresenter from '../presenters/DocumentPresenter.svelte'

  import ChangeDocCodePopup from '../popups/ChangeDocCodePopup.svelte'
  import DocumentInfo from './info/DocumentInfo.svelte'
  import RightPanelTabHeader from './RightPanelTabHeader.svelte'
  import DocumentInfoLabel from './info/DocumentInfoLabel.svelte'
  import AbstractEditor from '../editors/AbstractEditor.svelte'
  import DocumentFlatHierarchy from './info/DocumentFlatHierarchy.svelte'
  import DocumentPrefixPresenter from '../presenters/DocumentPrefixPresenter.svelte'
  import ChangeCategoryPopup from '../popups/ChangeCategoryPopup.svelte'

  const client = getClient()
  const hierarchy = client.getHierarchy()

  function handleCodeEdit (event: MouseEvent): void {
    event?.preventDefault()
    event?.stopPropagation()

    showPopup(
      ChangeDocCodePopup,
      {
        object: $controlledDocument
      },
      eventToHTMLElement(event)
    )
  }

  function handleCategoryEdit (event: MouseEvent): void {
    event?.preventDefault()
    event?.stopPropagation()

    showPopup(
      ChangeCategoryPopup,
      {
        object: $controlledDocument
      },
      eventToHTMLElement(event)
    )
  }

  $: isEditableDraft = $isEditable && $controlledDocument != null && $controlledDocument.state === DocumentState.Draft
  $: isInitialEditableDraft = isEditableDraft && $documentAllVersions.length === 1

  $: isTemplate =
    $controlledDocument != null && hierarchy.hasMixin($controlledDocument, documents.mixin.DocumentTemplate)

  let asTemplate: DocumentTemplate
  $: if ($controlledDocument != null && isTemplate) {
    asTemplate = hierarchy.as<Document, DocumentTemplate>($controlledDocument, documents.mixin.DocumentTemplate)
  }
</script>

<RightPanelTabHeader>
  <Label label={documentsRes.string.GeneralInfo} />
</RightPanelTabHeader>
{#if $controlledDocument && $projectRef}
  <Scroller>
    <div class="p-5 pt-6 w-full text-md bottom-divider">
      <DocumentInfo label={documentsRes.string.ID}>
        <DocumentPresenter
          value={$controlledDocument}
          isRegular
          disableLink
          editable={isInitialEditableDraft}
          on:edit={(e) => {
            handleCodeEdit(e.detail)
          }}
        />
      </DocumentInfo>

      <DocumentInfo label={documentsRes.string.Category}>
        <CategoryPresenter
          value={$controlledDocument.category}
          editable={isEditableDraft}
          on:edit={(e) => {
            handleCategoryEdit(e.detail)
          }}
        />
      </DocumentInfo>

      {#if !isTemplate}
        <DocumentInfo label={documentsRes.string.TemplateName}>
          <DocumentTitlePresenter value={$controlledDocument.template} />
        </DocumentInfo>
      {/if}

      {#if isTemplate}
        <DocumentInfo label={documentsRes.string.DocumentPrefix}>
          <DocumentPrefixPresenter value={asTemplate} editable={isInitialEditableDraft} />
        </DocumentInfo>
      {/if}

      <DocumentInfo label={documentsRes.string.Version}>
        <DocumentVersionPresenter value={$controlledDocument} />
      </DocumentInfo>

      <DocumentInfo label={documentsRes.string.Modified}>
        <DatePresenter
          value={$controlledDocument.modifiedOn}
          editable={false}
          showIcon={false}
          mode={DateRangeMode.DATETIME}
          kind="regular"
        />
      </DocumentInfo>

      <DocumentInfo label={documentsRes.string.Status}>
        <StatePresenter value={$controlledDocument} showTag={false} />
      </DocumentInfo>

      <DocumentInfo label={documentsRes.string.Owner}>
        <OwnerPresenter
          _id={$controlledDocument.owner}
          object={$controlledDocument}
          isEditable={$isEditable}
          value={undefined}
          shouldShowLabel
        />
      </DocumentInfo>

      <DocumentInfo label={documentsRes.string.Author}>
        <PersonPresenter value={$controlledDocument.author} disabled={true} />
      </DocumentInfo>
    </div>

    <div class="flex-gap-2 p-5 pt-6 w-full text-md">
      <div class="py-2">
        <DocumentInfoLabel label={documentsRes.string.MetaAbstract} />
      </div>
      <div class="py-2">
        <AbstractEditor value={$controlledDocument} readonly={!$isEditable} />
      </div>
    </div>

    {#if $controlledDocument.space !== documents.space.UnsortedTemplates}
      <div class="flex-gap-2 p-5 pt-6 w-full text-md top-divider">
        <div class="py-2">
          <DocumentInfoLabel label={documentsRes.string.DocumentInHierarchy} />
        </div>

        <DocumentFlatHierarchy document={$controlledDocument} project={$projectRef} />
      </div>
    {/if}
  </Scroller>
{/if}
