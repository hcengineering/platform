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
  import chunter from '@hcengineering/chunter'
  import { Ref } from '@hcengineering/core'
  import { Button, Label, showPopup } from '@hcengineering/ui'
  import documents, { type DocumentComment } from '@hcengineering/controlled-documents'
  import { onDestroy } from 'svelte'
  import {
    $documentCommentHighlightedLocation as highlightedLocation,
    $documentComments as documentComments,
    $isDocumentCommentsFilterDirty as isFilterDirty,
    documentCommentsLocationNavigateRequested,
    documentCommentsNavigateRequested
  } from '../../../stores/editors/document'
  import { isDocumentCommentAttachedTo } from '../../../utils'
  import DocumentCommentThread from './DocumentCommentThread.svelte'
  import CommentFilterSettingsPopup from '../popups/CommentFilterSettingsPopup.svelte'
  import RightPanelTabHeader from './RightPanelTabHeader.svelte'

  const elements: Record<Ref<DocumentComment>, HTMLElement> = {}

  const handleScrollIntoView = (item: DocumentComment): void => {
    if (!item) {
      return
    }

    const itemElement = elements[item._id]
    if (itemElement) {
      itemElement.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const unsubscribeNavigateTo = documentCommentsNavigateRequested.subscribe({
    next: ({ value }) => {
      if (!value) {
        return
      }

      handleScrollIntoView(value)
    }
  })

  const handleItemHighlight = (item: DocumentComment) => () => {
    documentCommentsLocationNavigateRequested({
      nodeId: item.nodeId ?? null
    })
  }

  const handleOpenFilter = (ev?: Event) => {
    showPopup(CommentFilterSettingsPopup, {}, ev?.target as HTMLElement)
  }

  onDestroy(unsubscribeNavigateTo)
</script>

<RightPanelTabHeader>
  <div class="flex-between w-full">
    <Label label={chunter.string.Comments} />
    <div class="configure-button">
      <Button icon={documents.icon.Configure} kind="ghost" on:click={handleOpenFilter} />
      {#if $isFilterDirty}
        <div class="dirty-mark" />
      {/if}
    </div>
  </div>
</RightPanelTabHeader>
{#if $documentComments.length > 0}
  {#each $documentComments as object}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      bind:this={elements[object._id]}
      on:click={handleItemHighlight(object)}
      on:keydown={handleItemHighlight(object)}
      data-testid="comment"
    >
      <DocumentCommentThread
        value={object}
        highlighted={!!$highlightedLocation && isDocumentCommentAttachedTo(object, $highlightedLocation)}
      />
    </div>
  {/each}
{/if}

<style lang="scss">
  .configure-button {
    position: relative;
  }

  .dirty-mark {
    position: absolute;
    top: 0.375rem;
    right: 0.375rem;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background-color: var(--highlight-red);
  }
</style>
