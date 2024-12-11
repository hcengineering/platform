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
  import { type Ref, SortingOrder } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { getCurrentEmployee } from '@hcengineering/contact'
  import documents, {
    type ControlledDocument,
    type DocumentMeta,
    type HierarchyDocument,
    type Project,
    type ProjectMeta
  } from '@hcengineering/controlled-documents'

  import { compareDocs, notEmpty } from '../../../../utils'
  import DocumentFlatTreeElement from './DocumentFlatTreeElement.svelte'

  export let document: HierarchyDocument | undefined
  export let project: Ref<Project>

  const currentPerson = getCurrentEmployee()

  let meta: ProjectMeta | undefined
  const projectMetaQuery = createQuery()
  $: if (document !== undefined && project !== undefined) {
    projectMetaQuery.query(
      documents.class.ProjectMeta,
      {
        project,
        meta: document.attachedTo
      },
      (result) => {
        ;[meta] = result
      }
    )
  }

  let parentMetas: ProjectMeta[] | undefined
  const parentMetasQuery = createQuery()
  $: if (meta !== undefined) {
    parentMetasQuery.query(
      documents.class.ProjectMeta,
      {
        meta: { $in: meta.path },
        project: meta.project
      },
      (result) => {
        parentMetas = result
      }
    )
  } else {
    parentMetasQuery.unsubscribe()
  }

  let directChildrenMetas: ProjectMeta[] | undefined
  const childrenMetasQuery = createQuery()
  $: if (meta !== undefined) {
    childrenMetasQuery.query(
      documents.class.ProjectMeta,
      {
        parent: meta?.meta,
        project: meta.project
      },
      (result) => {
        if (meta === undefined) {
          return
        }

        directChildrenMetas = result
      }
    )
  } else {
    childrenMetasQuery.unsubscribe()
  }

  let docs: Record<Ref<DocumentMeta>, ControlledDocument> = {}
  const docsQuery = createQuery()
  $: if (parentMetas !== undefined && directChildrenMetas !== undefined) {
    docsQuery.query(
      documents.class.ProjectDocument,
      {
        attachedTo: { $in: [...parentMetas.map((p) => p._id), ...directChildrenMetas.map((p) => p._id)] }
      },
      (result) => {
        docs = {}
        let lastTemplate: string | undefined = '###'
        let lastSeqNumber = -1

        for (const prjdoc of result) {
          const doc = prjdoc.$lookup?.document as ControlledDocument | undefined
          if (doc === undefined) continue

          // TODO add proper fix, when document with no template copied, saved value is null
          const template = doc.template ?? undefined

          if (template === lastTemplate && doc.seqNumber === lastSeqNumber) {
            continue
          }

          if (
            doc.owner === currentPerson ||
            doc.coAuthors.findIndex((emp) => emp === currentPerson) >= 0 ||
            doc.approvers.findIndex((emp) => emp === currentPerson) >= 0 ||
            doc.reviewers.findIndex((emp) => emp === currentPerson) >= 0
          ) {
            docs[doc.attachedTo] = doc

            lastTemplate = template
            lastSeqNumber = doc.seqNumber
          }
        }
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
  } else {
    docsQuery.unsubscribe()
  }

  let directChildrenDocs: ControlledDocument[] = []
  $: if (directChildrenMetas !== undefined) {
    directChildrenDocs = Object.values(docs).filter(
      (d) => directChildrenMetas !== undefined && directChildrenMetas.findIndex((m) => m.meta === d.attachedTo) >= 0
    )
    directChildrenDocs.sort(compareDocs)
  }

  let parentDocs: ControlledDocument[] = []
  $: if (meta !== undefined) {
    parentDocs = [...meta.path]
      .reverse()
      .map((mId) => docs[mId])
      .filter(notEmpty)
  }

  let levels: Array<[HierarchyDocument[], boolean]> = []
  $: {
    levels = []

    if (parentDocs?.length > 0) {
      levels.push([parentDocs, false])
    }

    if (document !== undefined) {
      levels.push([[document], true])
    }

    if (directChildrenDocs?.length > 0) {
      levels.push([directChildrenDocs, false])
    }
  }
</script>

{#if levels.length > 0}
  {@const [firstDocs, firstHltd] = levels[0]}
  <div class="root">
    {#each firstDocs as doc}
      <DocumentFlatTreeElement {doc} {project} highlighted={firstHltd} />
    {/each}
    {#if levels.length > 1}
      {@const [secondDocs, secondHltd] = levels[1]}
      <div class="container">
        {#each secondDocs as doc}
          <DocumentFlatTreeElement {doc} {project} highlighted={secondHltd} />
        {/each}
        {#if levels.length > 2}
          {@const [thirdDocs, thirdHltd] = levels[2]}
          <div class="container">
            {#each thirdDocs as doc}
              <DocumentFlatTreeElement {doc} {project} highlighted={thirdHltd} />
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style lang="scss">
  .root {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .container {
    display: flex;
    flex-direction: column;
    padding: 0 1rem;
    border-left: 2px solid var(--theme-navpanel-border);
    gap: 0.25rem;
  }
</style>
