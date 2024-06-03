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
  import { DropdownIntlItem, DropdownLabelsIntl, Label, Toggle } from '@hcengineering/ui'
  import documents, { type DocumentComment } from '@hcengineering/controlled-documents'
  import {
    $documentCommentsFilter as documentCommentsFilter,
    documentCommentsShowResolvedToggled,
    documentCommentsSortByChanged,
    documentCommentsSortingAttributes
  } from '../../../stores/editors/document'
  import { getClient } from '@hcengineering/presentation'

  const hierarchy = getClient().getHierarchy()
  const sortingOptions: DropdownIntlItem[] = documentCommentsSortingAttributes.map((attr) => {
    const attribute = hierarchy.getAttribute(documents.class.DocumentComment, attr)
    return {
      id: attr,
      label: attribute.label
    }
  })

  const handleShowResolvedToggled = (): void => {
    documentCommentsShowResolvedToggled()
  }

  const handleSortingChanged = (event: CustomEvent<keyof DocumentComment>) => {
    documentCommentsSortByChanged(event.detail)
  }
</script>

<div class="antiCard dialog menu">
  <div class="antiCard-menu__spacer" />
  <div
    class="antiCard-menu__item hoverable ordering"
    on:click={handleShowResolvedToggled}
    on:keydown={handleShowResolvedToggled}
  >
    <span class="overflow-label"><Label label={documents.string.ShowResolved} /></span>

    <Toggle on={$documentCommentsFilter.showResolved} on:change={handleShowResolvedToggled} />
  </div>
  <div class="antiCard-menu__item ordering">
    <span class="overflow-label"><Label label={documents.string.Ordering} /></span>
    <DropdownLabelsIntl
      kind={'regular'}
      size={'medium'}
      items={sortingOptions}
      selected={$documentCommentsFilter.sortBy}
      justify="left"
      on:selected={handleSortingChanged}
    />
  </div>
  <div class="antiCard-menu__spacer" />
</div>
