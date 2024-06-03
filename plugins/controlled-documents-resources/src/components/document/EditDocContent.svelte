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
  import { Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Heading, TableOfContents, TableOfContentsContent } from '@hcengineering/text-editor'
  import { EditBox, IconCircles, Scroller } from '@hcengineering/ui'
  import { showMenu } from '@hcengineering/view-resources'
  import { DocumentSection, calcRank } from '@hcengineering/controlled-documents'
  import { onDestroy, tick } from 'svelte'
  import { flip } from 'svelte/animate'

  import {
    $controlledDocument as controlledDocument,
    documentCommentsLocationNavigateRequested,
    documentSectionCollapsed,
    documentSectionExpanded,
    $isEditable as isEditable,
    $controlledDocumentSectionIds as sectionIds,
    $controlledDocumentSections as sections
  } from '../../stores/editors/document'
  import DocSectionEditor from './DocSectionEditor.svelte'
  import DocumentTitle from './DocumentTitle.svelte'
  import DocumentPrintTitlePage from '../print/DocumentPrintTitlePage.svelte'

  const client = getClient()
  const sectionRefs: Record<string, HTMLElement> = {}
  let divScroll: HTMLElement
  const editors: DocSectionEditor[] = []
  const sectionHeadings: Record<Ref<DocumentSection>, Heading[]> = {}

  let draggingId: Ref<DocumentSection> | null = null
  let dragOverId: Ref<DocumentSection> | null = null
  let dragging = false

  let title = $controlledDocument?.title ?? ''

  $: headings = $sectionIds.map((sectionId) => sectionHeadings[sectionId] ?? []).flat()

  const unsubscribeNavigateToLocation = documentCommentsLocationNavigateRequested.subscribe({
    next: ({ sectionKey }) => {
      const element = sectionRefs[sectionKey]
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  })

  const handleUpdateTitle = () => {
    if (!$controlledDocument || !title) {
      return
    }
    const titleTrimmed = title.trim()

    if (titleTrimmed.length > 0 && titleTrimmed !== $controlledDocument.title) {
      client.update($controlledDocument, { title: titleTrimmed })
    }
  }

  function resetDrag (ev?: DragEvent): void {
    draggingId = null
    dragOverId = null
    dragging = false
  }

  function handleDragStart (ev: DragEvent, id: Ref<DocumentSection>): void {
    if (ev.dataTransfer) {
      dragging = true

      ev.dataTransfer.effectAllowed = 'move'
      ev.dataTransfer.dropEffect = 'move'

      const index = $sectionIds.indexOf(id)
      ev.dataTransfer.setDragImage(editors[index].getSectionElement(), 0, 0)

      draggingId = id
    }
  }

  async function handleDrop (ev: DragEvent, toId: Ref<DocumentSection>): Promise<void> {
    if (ev.dataTransfer && draggingId !== null && toId !== draggingId) {
      ev.dataTransfer.dropEffect = 'move'

      const draggingIndex = $sectionIds.indexOf(draggingId)
      const toIndex = $sectionIds.indexOf(toId)

      const [prev, next] = [
        $sections[draggingIndex < toIndex ? toIndex : toIndex - 1],
        $sections[draggingIndex < toIndex ? toIndex + 1 : toIndex]
      ]

      const section = $sections[draggingIndex]

      // workaround to not display editor toolbar
      documentSectionCollapsed(draggingId)
      documentSectionCollapsed(toId)

      await client.update(section, { rank: calcRank(prev, next) })
    }
    resetDrag()
  }

  function openSectionMenu (ev: MouseEvent, section: DocumentSection): void {
    if (!$sections || $sections.length === 0) {
      return
    }
    showMenu(ev, { object: section })
  }

  async function handleShowHeading (heading: Heading): Promise<void> {
    const sectionId = $sectionIds.find((sectionId) => sectionHeadings[sectionId]?.includes(heading))
    if (sectionId) {
      documentSectionExpanded(sectionId)
    }

    await tick()

    const element = window.document.getElementById(heading.id)
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  onDestroy(unsubscribeNavigateToLocation)
</script>

{#if $controlledDocument}
  <DocumentPrintTitlePage />

  <div class="root flex-col relative">
    <div class="toc">
      <TableOfContents items={headings} on:select={(ev) => handleShowHeading(ev.detail)} />
    </div>
    {#if headings.length > 0}
      <div class="only-print ml-12">
        <TableOfContentsContent items={headings} />
      </div>
      <div class="pagebreak" />
    {/if}
    <Scroller bind:divScroll>
      <div class="antiAccordion">
        <div class="doc-title">
          <DocumentTitle>
            {#if $isEditable}
              <EditBox
                value={title}
                on:value={(event) => {
                  title = event.detail
                }}
                on:blur={handleUpdateTitle}
              />
            {:else}
              {$controlledDocument.title}
            {/if}
          </DocumentTitle>
        </div>
        {#if $sections}
          {#each $sections as section, i (section._id)}
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div
              class="row"
              bind:this={sectionRefs[section.key]}
              class:is-dragging={section._id === draggingId}
              class:drag-over-highlight={section._id === dragOverId}
              on:dragstart={(ev) => {
                handleDragStart(ev, section._id)
              }}
              on:dragleave|preventDefault={() => {
                if (dragOverId === section._id) dragOverId = null
                return false
              }}
              on:dragover|preventDefault={() => {
                dragOverId = section._id
                return false
              }}
              on:dragend={resetDrag}
              on:drop|preventDefault={(ev) => handleDrop(ev, section._id)}
              animate:flip={{ duration: 400 }}
            >
              <DocSectionEditor
                bind:headings={sectionHeadings[section._id]}
                bind:this={editors[i]}
                value={section}
                document={$controlledDocument}
                index={i}
                {dragging}
                on:change={resetDrag}
              >
                <div class="m0 flex-row-center draggable-container" slot="before-header">
                  <!-- svelte-ignore a11y-click-events-have-key-events -->
                  <!-- svelte-ignore a11y-no-static-element-interactions -->
                  <div
                    class="draggable-mark"
                    class:dragging
                    on:click={(ev) => {
                      openSectionMenu(ev, section)
                    }}
                  >
                    <IconCircles size="small" />
                  </div>
                </div>
              </DocSectionEditor>
            </div>
          {/each}
        {/if}
      </div>
    </Scroller>
  </div>
{/if}

<style lang="scss">
  .root {
    @media print {
      margin-left: -1rem;
    }
  }

  .toc {
    position: absolute;
    width: 1rem;
    pointer-events: all;
    left: 1px;
    top: 1rem;
    z-index: 1;
  }

  .doc-title {
    padding-left: 3.25rem;
  }

  .row {
    position: relative;
    margin-left: 0;

    .draggable-container {
      width: 100%;
      height: 100%;

      .draggable-mark {
        padding: 0.375rem 0.125rem;
        &:hover {
          background-color: var(--theme-button-hovered);
          border-radius: 0.375rem;
          cursor: pointer;
        }
        &.dragging {
          cursor: grabbing;
          position: relative;
          align-self: baseline;
        }
      }
    }

    &:hover {
      .draggable-mark {
        opacity: 0.9;
      }
    }
  }

  .drag-over-highlight {
    opacity: 0.2;
  }
</style>
