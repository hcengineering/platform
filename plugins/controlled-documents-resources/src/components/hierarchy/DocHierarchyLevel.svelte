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
  import { type Ref, type Doc, SortingOrder, WithLookup } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { getCurrentEmployee } from '@hcengineering/contact'
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
  import { compareDocs } from '../../utils'

  export let projectMeta: ProjectMeta[] = []
  export let childrenByParent: Record<Ref<DocumentMeta>, Array<ProjectMeta>>
  export let selected: Ref<Doc> | undefined
  export let level: number = 0
  export let getMoreActions: ((obj: Doc, originalEvent?: MouseEvent) => Promise<Action[]>) | undefined = undefined
  export let collapsedPrefix: string = ''

  const dispatch = createEventDispatcher()
  const currentPerson = getCurrentEmployee()

  const docsQuery = createQuery()
  let docs: WithLookup<ProjectDocument>[] = []

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

      docs.sort((a, b) => {
        if (a.$lookup?.document !== undefined && b.$lookup?.document !== undefined) {
          return compareDocs(a.$lookup.document, b.$lookup.document)
        }
        return 0
      })
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

  async function getDocMoreActions (obj: Doc): Promise<Action[]> {
    return getMoreActions !== undefined ? await getMoreActions(obj) : []
  }
</script>

{#each docs as prjdoc}
  {@const doc = prjdoc.$lookup?.document}

  {#if doc}
    {@const children = childrenByParent[doc.attachedTo] ?? []}
    <TreeItem
      _id={doc._id}
      icon={documents.icon.Document}
      iconProps={{
        fill: 'currentColor'
      }}
      title={getDocumentName(doc)}
      selected={selected === doc._id || selected === prjdoc._id}
      isFold
      empty={children.length === 0 || children === undefined}
      actions={getMoreActions !== undefined ? () => getDocMoreActions(prjdoc) : undefined}
      {level}
      {collapsedPrefix}
      shouldTooltip
      on:click={() => {
        dispatch('selected', prjdoc)
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
            on:selected
          />
        {/if}
      </svelte:fragment>
    </TreeItem>
  {/if}
{/each}
