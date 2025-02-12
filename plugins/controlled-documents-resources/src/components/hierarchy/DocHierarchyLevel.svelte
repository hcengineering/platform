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
  import documents, {
    type DocumentMeta,
    DocumentState,
    ProjectDocumentTree,
    getDocumentName
  } from '@hcengineering/controlled-documents'
  import { type Doc, type Ref } from '@hcengineering/core'
  import { type Action } from '@hcengineering/ui'
  import { TreeItem } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'

  export let tree = new ProjectDocumentTree()
  export let documentIds: Ref<DocumentMeta>[] = []

  export let selected: Ref<Doc> | undefined
  export let level: number = 0
  export let getMoreActions: ((obj: Doc, originalEvent?: MouseEvent) => Promise<Action[]>) | undefined = undefined
  export let collapsedPrefix: string = ''

  export let onDragStart: ((e: DragEvent, object: Ref<DocumentMeta>) => void) | undefined = undefined
  export let onDragOver: ((e: DragEvent, object: Ref<DocumentMeta>) => void) | undefined = undefined
  export let onDragEnd: ((e: DragEvent, object: Ref<DocumentMeta>) => void) | undefined = undefined
  export let onDrop: ((e: DragEvent, object: Ref<DocumentMeta>) => void) | undefined = undefined

  export let draggedItem: Ref<DocumentMeta> | undefined = undefined
  export let draggedOver: Ref<DocumentMeta> | undefined = undefined

  import DropArea from './DropArea.svelte'

  const removeStates = [DocumentState.Obsolete, DocumentState.Deleted]

  const dispatch = createEventDispatcher()

  async function getDocMoreActions (obj: Doc): Promise<Action[]> {
    return getMoreActions !== undefined ? await getMoreActions(obj) : []
  }
</script>

{#each documentIds as metaid}
  {@const bundle = tree.bundleOf(metaid)}
  {@const prjdoc = bundle?.ProjectDocument[0]}
  {@const doc = bundle?.ControlledDocument[0]}
  {@const meta = bundle?.DocumentMeta[0]}
  {@const title = doc ? getDocumentName(doc) : meta?.title ?? ''}
  {@const docid = doc?._id ?? prjdoc?._id}
  {@const isFolder = prjdoc?.document === documents.ids.Folder}
  {@const children = tree.childrenOf(metaid)}
  {@const isRemoved = doc && removeStates.includes(doc.state)}

  {#if prjdoc && metaid}
    {@const isDraggedOver = draggedOver === metaid}
    <div class="flex-col relative">
      {#if isDraggedOver}
        <DropArea />
      {/if}
      <TreeItem
        _id={docid}
        icon={isFolder ? documents.icon.Folder : documents.icon.Document}
        iconProps={{
          fill: isRemoved ? 'var(--dangerous-bg-color)' : 'currentColor'
        }}
        {title}
        selected={selected === docid || selected === prjdoc._id}
        isFold
        empty={children.length === 0}
        actions={getMoreActions !== undefined ? () => getDocMoreActions(prjdoc) : undefined}
        {level}
        {collapsedPrefix}
        shouldTooltip
        on:click={() => {
          dispatch('selected', prjdoc)
        }}
        draggable={onDragStart !== undefined}
        on:dragstart={(evt) => {
          onDragStart?.(evt, metaid)
        }}
        on:dragover={(evt) => {
          onDragOver?.(evt, metaid)
        }}
        on:dragend={(evt) => {
          onDragEnd?.(evt, metaid)
        }}
        on:drop={(evt) => {
          onDrop?.(evt, metaid)
        }}
      >
        <svelte:fragment slot="dropbox">
          {#if children.length}
            <svelte:self
              documentIds={children}
              {tree}
              {selected}
              {collapsedPrefix}
              {getMoreActions}
              level={level + 1}
              {onDragStart}
              {onDragOver}
              {onDragEnd}
              {onDrop}
              {draggedItem}
              {draggedOver}
              on:selected
            />
          {/if}
        </svelte:fragment>
      </TreeItem>
    </div>
  {/if}
{/each}
