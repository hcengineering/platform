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
  import { WithLookup, type Doc, type Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { getPlatformColorForTextDef, themeStore } from '@hcengineering/ui'
  import documents, {
    type DocumentMeta,
    type DocumentSpace,
    type Project,
    type ProjectMeta
  } from '@hcengineering/controlled-documents'

  import FolderCollapsed from '../icons/FolderCollapsed.svelte'
  import FolderExpanded from '../icons/FolderExpanded.svelte'
  import DocHierarchyLevel from './DocHierarchyLevel.svelte'
  import DocHierarchyTreeElement from './DocHierarchyTreeElement.svelte'
  import { getPrefixedTreeCollapsed, setPrefixedTreeCollapsed, getProjectDocsHierarchy } from '../../utils'

  export let space: DocumentSpace
  export let project: Ref<Project> | undefined
  export let selected: Ref<Doc> | undefined
  export let collapsedPrefix: string = ''

  const dispatch = createEventDispatcher()
  let collapsed: boolean = getPrefixedTreeCollapsed(space._id, collapsedPrefix)
  $: setPrefixedTreeCollapsed(space._id, collapsedPrefix, collapsed)
  $: folderIcon = collapsed ? FolderCollapsed : FolderExpanded

  let rootDocs: Array<WithLookup<ProjectMeta>> = []
  let childrenByParent: Record<Ref<DocumentMeta>, Array<WithLookup<ProjectMeta>>> = {}

  const docsQuery = createQuery()
  $: docsQuery.query(
    documents.class.ProjectMeta,
    {
      space: space._id,
      project
    },
    (result) => {
      ;({ rootDocs, childrenByParent } = getProjectDocsHierarchy(result))
    }
  )
</script>

<div class="root">
  <DocHierarchyTreeElement
    bind:collapsed
    docId={space?._id}
    icon={folderIcon}
    iconProps={{
      fill: getPlatformColorForTextDef(space.name, $themeStore.dark).icon
    }}
    title={space.name}
    folder
    selected={selected === undefined}
    parent={rootDocs.length > 0}
    {collapsedPrefix}
    on:click={() => {
      dispatch('selected', space)
    }}
  >
    <DocHierarchyLevel projectMeta={rootDocs} {childrenByParent} {selected} {collapsedPrefix} on:selected />
  </DocHierarchyTreeElement>
</div>

<style lang="scss">
  :global(.root .antiNav-element) {
    margin: 0;
  }
</style>
