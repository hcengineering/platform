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
  import { createEventDispatcher, onDestroy } from 'svelte'

  import { Class, Doc, DocumentQuery, Ref, SortingOrder } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import ui, { Action, Button, IconEdit, navigate, type Location, Scroller, location, getLocation } from '@hcengineering/ui'
  import { getResource, type Resource } from '@hcengineering/platform'
  import { IntlString, Asset } from '@hcengineering/platform'

  import { FoldersStore, FoldersState, emptyFoldersState, getFoldersManager, resetState } from './store/folderStore'
  import FolderTreeLevel from './FolderTreeLevel.svelte'
  import { TreeNode, TreeItem, getActions as getContributedActions } from '../../index'
  import { Unsubscriber } from 'svelte/motion'

  export let _class: Ref<Class<Doc>>
  export let query: DocumentQuery<Doc>
  export let titleKey: string = 'title'
  export let parentKey: string = 'parent'
  export let noParentId: Ref<Doc>
  export let getFolderLink: Resource<(doc: Ref<Doc> | undefined) => Location> | undefined
  export let allObjectsIcon: Asset
  export let allObjectsLabel: IntlString
  export let plainList: boolean = false
  export let storeId: string = 'default'
  export let filterKey: string = 'attachedTo'
  export let syncWithLocationQuery: boolean = false
  export let limit = 100

  const dispatch = createEventDispatcher()

  const getFolderId = (): Ref<Doc> => {
    return (getLocation()?.query?.[filterKey] as Ref<Doc>) ?? noParentId
  }

  export let forciblyСollapsed: boolean = false

  const client = getClient()

  let foldersState: FoldersState = emptyFoldersState()
  let count = 0
  let total = 0

  const foldersManager = getFoldersManager(storeId, titleKey, parentKey, noParentId, plainList)

  const unsubscribe = FoldersStore.subscribe((store) => {
    foldersState = store.get(storeId) ?? emptyFoldersState()
  })

  let selected: Ref<Doc> = getFolderId()
  let visibleItem: Doc | undefined = foldersState.folderById.get(selected)

  let unsubscribeLoc: Unsubscriber | undefined = undefined
  if (syncWithLocationQuery) {
    unsubscribeLoc = location.subscribe(() => {
      selected = getFolderId()
      visibleItem = foldersState.folderById.get(selected)
    })
  }

  onDestroy(() => {
    resetState(storeId)
    unsubscribe()
    if (unsubscribeLoc !== undefined) {
      unsubscribeLoc()
    }
  })

  const q = createQuery()
  $: q.query(
    _class,
    query ?? {},
    async (result) => {
      foldersManager.setFolders(result)
      total = result.total
      count = result.length
      if (plainList && foldersState.folders?.length > 0) {
        if (selected === undefined) {
          await handleFolderSelected(foldersState.folders[0])
        }
      }
    },
    {
      limit,
      total: true,
      sort: {
        name: SortingOrder.Ascending
      }
    }
  )

  async function handleFolderSelected (_id: Ref<Doc>): Promise<void> {
    if (getFolderLink !== undefined) {
      const getFolderLinkFunction = await getResource(getFolderLink)
      navigate(getFolderLinkFunction(_id))
    } else {
      selected = _id
    }
    dispatch('select', _id)
  }

  async function handleAllItemsSelected (): Promise<void> {
    await handleFolderSelected(noParentId)
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

<Scroller padding={'1rem 0'}>
  {#if noParentId !== undefined}
    <TreeNode
      _id={noParentId}
      icon={allObjectsIcon}
      label={allObjectsLabel}
      selected={selected === noParentId}
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
        on:selected={async (ev) => {
          await handleFolderSelected(ev.detail)
        }}
      />
      <svelte:fragment slot="visible">
        {#if (selected || forciblyСollapsed) && visibleItem !== undefined}
          {@const folder = visibleItem}
          <TreeItem
            _id={folder._id}
            folderIcon
            iconProps={{ fill: 'var(--global-accent-IconColor)' }}
            title={foldersManager.getTitle(folder)}
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
  {:else}
    <FolderTreeLevel
      folders={foldersState.folders}
      descendants={foldersState.descendants}
      folderById={foldersState.folderById}
      {selected}
      on:selected={async (ev) => {
        await handleFolderSelected(ev.detail)
      }}
    />
  {/if}
  {#if count > 0 && count < total}
    <Button
      label={ui.string.ShowMore}
      kind={'ghost'}
      size={'small'}
      on:click={() => {
        limit = limit + 100
      }}
    />
  {/if}
</Scroller>
