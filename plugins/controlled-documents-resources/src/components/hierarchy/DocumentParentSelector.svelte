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
  import documents, { ProjectDocumentTree, type DocumentSpace, type Project } from '@hcengineering/controlled-documents'
  import { type Doc, type Ref } from '@hcengineering/core'
  import { getPlatformColorForTextDef, themeStore } from '@hcengineering/ui'
  import { TreeNode } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'

  import { createDocumentHierarchyQuery } from '../../utils'
  import DocHierarchyLevel from './DocHierarchyLevel.svelte'

  export let space: DocumentSpace
  export let project: Ref<Project> | undefined
  export let selected: Ref<Doc> | undefined
  export let collapsedPrefix: string = ''

  const dispatch = createEventDispatcher()

  let tree = new ProjectDocumentTree()

  const query = createDocumentHierarchyQuery()
  $: if (document !== undefined && project !== undefined) {
    query.query(space._id, project, (data) => {
      tree = data
    })
  }

  $: root = tree.childrenOf(documents.ids.NoParent)
</script>

<TreeNode
  _id={space?._id}
  folderIcon
  iconProps={{
    fill: getPlatformColorForTextDef(space.name, $themeStore.dark).icon
  }}
  title={space.name}
  highlighted={selected !== undefined}
  selected={selected === undefined}
  empty={root.length === 0}
  {collapsedPrefix}
  type={'nested-selectable'}
  on:click={() => {
    dispatch('selected', space)
  }}
>
  <DocHierarchyLevel documentIds={root} {tree} {selected} {collapsedPrefix} on:selected />
</TreeNode>
