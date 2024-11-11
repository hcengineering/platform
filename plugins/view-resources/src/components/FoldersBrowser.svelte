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
  import { Class, Doc, DocumentQuery, Ref, SortingOrder } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Action, IconEdit, navigate } from '@hcengineering/ui'
  import { getResource, type Resource } from '@hcengineering/platform'
  import { IntlString, Asset } from '@hcengineering/platform'

  import {FoldersManager, FoldersStore, FoldersState} from '../stores/folderStore'
  import FolderTreeLevel from './FolderTreeLevel.svelte'
  import {TreeNode, TreeItem, getActions as getContributedActions } from '../index'

  export let _class: Ref<Class<Doc>>
  export let query: DocumentQuery<Doc>
  export let titleKey: string = 'title'
  export let parentKey: string = 'parent'
  export let getFolderLink: Resource<(doc: Doc, props: Record<string, any>) => Location>
  export let getFolderIdFromFragment: Resource<(fragment: string) => Ref<Doc> | undefined>
  export let allObjectsIcon: Asset
  export let allObjectsLabel: IntlString

  export let currentFragment: string | undefined
  export let forciblyСollapsed: boolean = false

  const client = getClient()

  let foldersState: FoldersState = FoldersState.empty()

  let foldersManager: FoldersManager = new FoldersManager(titleKey, parentKey)

  FoldersStore.subscribe((newState) => {
    foldersState = newState
  })

  let selected: Ref<Doc> | undefined
  let visibleItem: Doc | undefined

  const q = createQuery()
  q.query(
    _class,
    query || {},
    (result) => {
      foldersManager.setFolders(result)
    },
    {
      sort: {
        name: SortingOrder.Ascending
      }
    }
  )

  async function handleFolderSelected (_id: Ref<Doc>) {
    selected = _id
    visibleItem = selected !== undefined ? foldersState.folderById.get(selected as Ref<Doc>) : undefined
    const folder = foldersState.folderById.get(_id)
    if (getFolderLink) {
      const getFolderLinkFunction = await getResource(getFolderLink)
      navigate(getFolderLinkFunction(_id, folder?.space))
    }
  }

  async function handleAllItemsSelected () {
    selected = undefined
    visibleItem = undefined
    const folder = selected && foldersState.folderById.get(selected)
    if (folder && getFolderLink) {
      const getFolderLinkFunction = await getResource(getFolderLink)
      navigate(getFolderLinkFunction(undefined, folder?.space))
    }
  }

  async function getFolderActions (obj: Doc): Promise<Action[]> {
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

  async function getRootActions (): Promise<Action[]> {
    return []
  }
</script>

<div>
  <TreeNode
    icon={allObjectsIcon}
    label={allObjectsLabel}
    selected={!selected}
    type={'nested-selectable'}
    empty={foldersState?.folders?.length === 0}
    actions={() => getRootActions()}
    {forciblyСollapsed}
    on:click={handleAllItemsSelected}
  >
    <FolderTreeLevel
      folders={foldersState.folders}
      descendants={foldersState.descendants}
      folderById={foldersState.folderById}
      {selected}
      {titleKey}
      on:selected={(ev) => {
        handleFolderSelected(ev.detail)
      }}
    />
    <svelte:fragment slot="visible">
      {#if (selected || forciblyСollapsed) && visibleItem}
        {@const folder = visibleItem}
        {console.log("TreeItem")}
        <TreeItem
          _id={folder._id}
          folderIcon
          iconProps={{ fill: 'var(--global-accent-IconColor)' }}
          title={folder.name}
          selected
          isFold
          empty
          actions={async () => await getFolderActions(folder)}
          shouldTooltip
          forciblyСollapsed
        />
        <span>It works</span>
      {/if}
    </svelte:fragment>
  </TreeNode>
</div>
