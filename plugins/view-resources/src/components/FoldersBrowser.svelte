<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { Class, Doc, DocumentQuery, Ref, SortingOrder, Space } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Action } from '@hcengineering/ui'

  import TreeItem from './navigator/TreeItem.svelte'
  import FolderTreeLevel from './FolderTreeLevel.svelte'

  //import { getFolderIdFromFragment, getFolderLink } from '../navigation'


  export let _class: Ref<Class<Doc>>
  export let query: DocumentQuery<Doc>


  export let currentFragment: string | undefined
  export let forciblyСollapsed: boolean = false

  let folders: Ref<Doc>[] = []
  let folderById: Map<Ref<Doc>, Doc> = new Map<Ref<Doc>, Doc>()
  let descendants: Map<Ref<Doc> | null, Doc[]> = new Map<Ref<Doc>, Doc[]>()

  function getDescendants (obj: Ref<Doc> | null): Ref<Doc>[] {
    return (descendants.get(obj) ?? []).sort((a, b) => a.title.localeCompare(b.title)).map((p) => p._id)
  }

  let selected: Ref<Doc> | undefined
  let visibleItem: Doc | undefined
  //$: selected = getFolderIdFromFragment(currentFragment ?? '')
  $: visibleItem = selected !== undefined ? folderById.get(selected as Ref<Doc>) : undefined

  const q = createQuery()
  q.query(
    _class,
    query,
    (result) => {
      folderById.clear()
      descendants.clear()

      for (const doc of result) {
        const current = descendants.get(doc.parent) ?? []
        current.push(doc)
        descendants.set(doc.parent || null, current)
        folderById.set(doc._id, doc)
      }

      folderById = folderById
      descendants = descendants
      folders = getDescendants(null)
    },
    {
      sort: {
        name: SortingOrder.Ascending
      }
    }
  )

  function handleFolderSelected (_id: Ref<Doc>): void {
    //navigate(getFolderLink(_id))
  }

  async function getFolderActions (obj: Doc): Promise<Action[]> {
    return []
  }
</script>

<FolderTreeLevel
  {folders}
  {descendants}
  {folderById}
  {selected}
  on:selected={(ev) => {
    handleFolderSelected(ev.detail)
  }}
/>
{#if (selected || forciblyСollapsed) && visibleItem}
  {@const folder = visibleItem}
  <TreeItem
    _id={folder._id}
    folderIcon
    iconProps={{ fill: 'var(--global-accent-IconColor)' }}
    title={folder.title}
    selected
    isFold
    empty
    actions={async () => await getFolderActions(folder)}
    shouldTooltip
    forciblyСollapsed
  />
{/if}

