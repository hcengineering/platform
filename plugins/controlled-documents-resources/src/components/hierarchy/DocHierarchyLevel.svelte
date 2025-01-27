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
  import { type Ref, type Doc, SortingOrder, getCurrentAccount, WithLookup } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import type { PersonAccount } from '@hcengineering/contact'
  import { type Action } from '@hcengineering/ui'
  import documents, {
    type ControlledDocument,
    type DocumentMeta,
    type ProjectMeta,
    type ProjectDocument,
    getDocumentName,
    DocumentState
  } from '@hcengineering/controlled-documents'
  import { TreeItem } from '@hcengineering/view-resources'

  export let projectMeta: ProjectMeta[] = []
  export let childrenByParent: Record<Ref<DocumentMeta>, Array<ProjectMeta>>
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

  const dispatch = createEventDispatcher()
  const currentUser = getCurrentAccount() as PersonAccount
  const currentPerson = currentUser.person

  let docs: WithLookup<ProjectDocument>[] = []

  function sortDocs (meta: ProjectMeta[]): void {
    const metaById = new Map(meta.map((p) => [p._id, p]))
    docs = docs.slice().sort((a, b) => {
      const metaA = metaById.get(a.attachedTo)
      const metaB = metaById.get(b.attachedTo)

      if (metaA !== undefined && metaB !== undefined) {
        return metaA.rank.localeCompare(metaB.rank)
      }
      return 0
    })
  }

  $: sortDocs(projectMeta)

  const docsQuery = createQuery()

  $: docsQuery.query(
    documents.class.ProjectDocument,
    {
      '$lookup.document.state': { $ne: DocumentState.Deleted },
      attachedTo: { $in: projectMeta.map((p) => p._id) }
    },
    (result) => {
      docs = []
      let lastTemplate: string | undefined = '###'
      let lastSeqNumber = -1

      for (const prjdoc of result) {
        if (prjdoc.document === documents.ids.Folder) {
          docs.push(prjdoc)
          continue
        }

        const doc = prjdoc.$lookup?.document as ControlledDocument | undefined
        if (doc === undefined) continue
        if (doc.state === DocumentState.Deleted) continue

        // TODO add proper fix, when document with no template copied, saved value is null
        const template = doc.template ?? undefined
        if (template === lastTemplate && doc.seqNumber === lastSeqNumber) {
          continue
        }

        if (
          [DocumentState.Effective, DocumentState.Archived].includes(doc.state) ||
          doc.owner === currentPerson ||
          doc.coAuthors.findIndex((emp) => emp === currentPerson) >= 0 ||
          doc.approvers.findIndex((emp) => emp === currentPerson) >= 0 ||
          doc.reviewers.findIndex((emp) => emp === currentPerson) >= 0
        ) {
          docs.push(prjdoc)

          lastTemplate = template
          lastSeqNumber = doc.seqNumber
        }
      }

      sortDocs(projectMeta)
    },
    {
      lookup: {
        document: documents.class.ControlledDocument
      },
      sort: {
        '$lookup.document.template': SortingOrder.Ascending,
        '$lookup.document.seqNumber': SortingOrder.Ascending,
        '$lookup.document.major': SortingOrder.Descending,
        '$lookup.document.minor': SortingOrder.Descending,
        '$lookup.document.patch': SortingOrder.Descending
      }
    }
  )

  let docsMeta: DocumentMeta[] = []

  const metaQuery = createQuery()
  $: metaQuery.query(documents.class.DocumentMeta, { _id: { $in: projectMeta.map((p) => p.meta) } }, (result) => {
    docsMeta = result
  })

  async function getDocMoreActions (obj: Doc): Promise<Action[]> {
    return getMoreActions !== undefined ? await getMoreActions(obj) : []
  }

  $: projectMetaById = new Map(projectMeta.map((m) => [m._id, m]))
  $: docsMetaById = new Map(docsMeta.map((m) => [m._id, m]))
</script>

{#each docs as prjdoc}
  {@const pjmeta = projectMetaById.get(prjdoc.attachedTo)}
  {@const doc = prjdoc.$lookup?.document}
  {@const metaid = pjmeta?.meta}
  {@const meta = metaid ? docsMetaById.get(metaid) : undefined}
  {@const title = doc ? getDocumentName(doc) : meta?.title ?? ''}
  {@const docid = doc?._id ?? prjdoc._id}
  {@const isFolder = prjdoc.document === documents.ids.Folder}

  {#if metaid}
    {@const children = childrenByParent[metaid] ?? []}
    {@const isDraggedOver = draggedOver === metaid}
    <div class="flex-col relative">
      {#if isDraggedOver}
        <DropArea />
      {/if}
      <TreeItem
        _id={docid}
        icon={isFolder ? documents.icon.Folder : documents.icon.Document}
        iconProps={{
          fill: 'currentColor'
        }}
        {title}
        selected={selected === docid || selected === prjdoc._id}
        isFold
        empty={children.length === 0 || children === undefined}
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
              projectMeta={children}
              {childrenByParent}
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
