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
  import {
    DocumentBundle,
    ProjectDocumentTree,
    type HierarchyDocument,
    type Project
  } from '@hcengineering/controlled-documents'
  import { type Ref } from '@hcengineering/core'

  import { createDocumentHierarchyQuery } from '../../../../utils'
  import DocumentFlatTreeElement from './DocumentFlatTreeElement.svelte'

  export let document: HierarchyDocument | undefined
  export let project: Ref<Project>

  let tree = new ProjectDocumentTree()

  const query = createDocumentHierarchyQuery()
  $: if (document !== undefined && project !== undefined) {
    query.query(document.space, project, (data) => {
      tree = data
    })
  }

  $: docmetaid = tree.metaOf(document?._id)

  let levels: Array<[DocumentBundle[], boolean]> = []
  $: {
    levels = []
    const parents = tree
      .parentChainOf(docmetaid)
      .reverse()
      .map((ref) => tree.bundleOf(ref))
      .filter((r) => r !== undefined)
    const me = tree.bundleOf(docmetaid)
    const children = tree
      .childrenOf(docmetaid)
      .map((ref) => tree.bundleOf(ref))
      .filter((r) => r !== undefined)

    if (parents.length > 0) levels.push([parents as DocumentBundle[], false])
    if (me) {
      levels.push([[me], true])
    }
    if (children.length > 0) levels.push([children as DocumentBundle[], false])
  }
</script>

{#if levels.length > 0}
  {@const [firstDocs, firstHltd] = levels[0]}
  <div class="root">
    {#each firstDocs as bundle}
      <DocumentFlatTreeElement {bundle} {project} highlighted={firstHltd} />
    {/each}
    {#if levels.length > 1}
      {@const [secondDocs, secondHltd] = levels[1]}
      <div class="container">
        {#each secondDocs as bundle}
          <DocumentFlatTreeElement {bundle} {project} highlighted={secondHltd} />
        {/each}
        {#if levels.length > 2}
          {@const [thirdDocs, thirdHltd] = levels[2]}
          <div class="container">
            {#each thirdDocs as bundle}
              <DocumentFlatTreeElement {bundle} {project} highlighted={thirdHltd} />
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
