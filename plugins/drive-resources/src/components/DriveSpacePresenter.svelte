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
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Action, navigate, IconEdit } from '@hcengineering/ui'
  import { TreeNode, TreeItem, getActions as getContributedActions } from '@hcengineering/view-resources'
  import { getResource } from '@hcengineering/platform'

  import drive from '../plugin'
  import { getDriveLink, getFolderIdFromFragment, getFolderLink } from '../navigation'
  import FolderTreeLevel from './FolderTreeLevel.svelte'

  export let space: Drive
  export let currentSpace: Ref<Space> | undefined
  export let currentSpecial: string | undefined
  export let currentFragment: string | undefined
  export let getActions: (space: Space) => Promise<Action[]> = async () => []
  export let forciblyСollapsed: boolean = false
  export let deselect: boolean = false

  const client = getClient()

  let folders: Ref<Folder>[] = []
  let folderById: Map<Ref<Folder>, Folder> = new Map<Ref<Folder>, Folder>()
  let descendants: Map<Ref<Folder>, Folder[]> = new Map<Ref<Folder>, Folder[]>()

  function getDescendants (obj: Ref<Folder>): Ref<Folder>[] {
    return (descendants.get(obj) ?? []).sort((a, b) => a.title.localeCompare(b.title)).map((p) => p._id)
  }

  let selected: Ref<Doc> | undefined
  let visibleItem: Folder | undefined
  $: selected = getFolderIdFromFragment(currentFragment ?? '')
  $: visibleItem = selected !== undefined ? folderById.get(selected as Ref<Folder>) : undefined

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

  async function getFolderActions (obj: Folder): Promise<Action[]> {
    const result: Action[] = []
    const extraActions = await getContributedActions(client, obj)
    for (const act of extraActions) {
      result.push({
        icon: act.icon ?? IconEdit,
        label: act.label,
        action: async (ctx: any, evt: Event) => {
          const impl = await getResource(act.action)
          await impl(obj, evt, act.actionProps)
        }
      })
    }
    return result
  }
</script>

{#if space}
  <TreeNode
    _id={space._id}
    icon={drive.icon.Drive}
    title={space.name}
    highlighted={currentSpace === space._id && !deselect}
    selected={currentSpace === space._id && selected === drive.ids.Root && currentFragment !== undefined && !deselect}
    visible={(currentSpace === space._id && !deselect && descendants.size !== 0 && selected !== space._id) ||
      (forciblyСollapsed && currentFragment !== undefined)}
    type={'nested-selectable'}
    empty={descendants.size === 0 || (forciblyСollapsed && selected === space._id && !deselect)}
    actions={() => getActions(space)}
    {forciblyСollapsed}
    on:click={() => {
      handleDriveSelected(space._id)
    }}
  >
    <FolderTreeLevel
      {folders}
      {descendants}
      {folderById}
      {selected}
      on:selected={(ev) => {
        handleFolderSelected(ev.detail)
      }}
    />

    <svelte:fragment slot="visible">
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
    </svelte:fragment>
  </TreeNode>
{/if}
