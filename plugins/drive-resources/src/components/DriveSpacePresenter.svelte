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
  import { Doc, Ref, SortingOrder, Space } from '@hcengineering/core'
  import { Drive, Folder } from '@hcengineering/drive'
  import { createQuery } from '@hcengineering/presentation'
  import { Action, navigate } from '@hcengineering/ui'

  import drive from '../plugin'
  import { getDriveLink, getFolderIdFromFragment, getFolderLink } from '../navigation'
  import FolderTreeLevel from './FolderTreeLevel.svelte'
  import FolderTreeElement from './FolderTreeElement.svelte'

  export let space: Drive
  export let currentSpace: Ref<Space> | undefined
  export let currentSpecial: string | undefined
  export let currentFragment: string | undefined
  export let getActions: (space: Space) => Promise<Action[]> = async () => []

  let folders: Ref<Folder>[] = []
  let folderById: Map<Ref<Folder>, Folder> = new Map<Ref<Folder>, Folder>()
  let descendants: Map<Ref<Folder>, Folder[]> = new Map<Ref<Folder>, Folder[]>()

  function getDescendants (obj: Ref<Folder>): Ref<Folder>[] {
    return (descendants.get(obj) ?? []).sort((a, b) => a.name.localeCompare(b.name)).map((p) => p._id)
  }

  let selected: Ref<Doc> | undefined
  $: selected = getFolderIdFromFragment(currentFragment ?? '')

  const query = createQuery()
  query.query(
    drive.class.Folder,
    {
      space: space._id
    },
    (result) => {
      folderById.clear()
      descendants.clear()

      for (const doc of result) {
        const current = descendants.get(doc.parent) ?? []
        current.push(doc)
        descendants.set(doc.parent, current)
        folderById.set(doc._id, doc)
      }

      folderById = folderById
      descendants = descendants
      folders = getDescendants(drive.ids.Root)
    },
    {
      sort: {
        name: SortingOrder.Ascending
      }
    }
  )

  function handleDriveSelected (_id: Ref<Drive>): void {
    navigate(getDriveLink(_id))
  }

  function handleFolderSelected (_id: Ref<Folder>): void {
    navigate(getFolderLink(_id))
  }
</script>

{#if space}
  <FolderTreeElement
    _id={space._id}
    icon={drive.icon.Drive}
    title={space.name}
    selected={currentSpace === space._id && selected === space._id}
    parent={descendants.size > 0}
    actions={() => getActions(space)}
    on:click={() => {
      handleDriveSelected(space._id)
    }}
  >
    <!-- <TreeNode
    {collapsed}
    _id={space._id}
    icon={drive.icon.Drive}
    title={space.name}
    folder
    parent={descendants.size > 0}
    actions={() => getActions(space)}
    on:click={() => {
      if (selected === space?._id) {
        collapsed = !collapsed
      } else {
        handleDriveSelected(space._id)
      }
    }}
  > -->
    <FolderTreeLevel
      {folders}
      {descendants}
      {folderById}
      {selected}
      on:selected={(ev) => {
        handleFolderSelected(ev.detail)
      }}
    />
    <!-- </TreeNode> -->
  </FolderTreeElement>
{/if}
