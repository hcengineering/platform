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
  import { Ref, SortingOrder, Space, generateId } from '@hcengineering/core'
  import { Document, Teamspace } from '@hcengineering/document'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import {
    IconWithEmoji,
    IconEdit,
    getPlatformColorDef,
    getPlatformColorForTextDef,
    themeStore,
    Action,
    IconAdd
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { TreeNode, openDoc, getActions as getContributedActions } from '@hcengineering/view-resources'
  import { SpacesNavModel } from '@hcengineering/workbench'
  import { getResource } from '@hcengineering/platform'

  import document from '../../plugin'
  import { getDocumentIdFromFragment, createEmptyDocument } from '../../utils'
  import DocHierarchy from './DocHierarchy.svelte'
  import DocTreeElement from './DocTreeElement.svelte'

  export let space: Teamspace
  export let model: SpacesNavModel
  export let currentSpace: Ref<Space> | undefined
  export let currentSpecial: string | undefined
  export let currentFragment: string | undefined
  export let getActions: (space: Space) => Promise<Action[]> = async () => []
  export let deselect: boolean = false
  export let forciblyСollapsed: boolean = false

  const client = getClient()

  let documents: Ref<Document>[] = []
  let documentById: Map<Ref<Document>, Document> = new Map<Ref<Document>, Document>()
  let descendants: Map<Ref<Document>, Document[]> = new Map<Ref<Document>, Document[]>()

  function getDescendants (obj: Ref<Document>): Ref<Document>[] {
    return (descendants.get(obj) ?? []).sort((a, b) => a.name.localeCompare(b.name)).map((p) => p._id)
  }

  let selected: Ref<Document> | undefined
  $: selected = getDocumentIdFromFragment(currentFragment ?? '')
  let visibleItem: Document | undefined
  $: visibleItem = selected !== undefined ? documentById.get(selected) : undefined

  // TODO expand tree until the selected document ?

  const query = createQuery()
  query.query(
    document.class.Document,
    {
      space: space._id
    },
    (result) => {
      documentById.clear()
      descendants.clear()

      for (const doc of result) {
        const current = descendants.get(doc.attachedTo) ?? []
        current.push(doc)
        descendants.set(doc.attachedTo, current)
        documentById.set(doc._id, doc)
      }

      documentById = documentById
      descendants = descendants
      documents = getDescendants(document.ids.NoParent)
    },
    {
      sort: {
        name: SortingOrder.Ascending
      }
    }
  )

  function getDocActions (doc: Document): Action[] {
    return [
      {
        icon: IconAdd,
        label: document.string.CreateDocument,
        action: async (ctx: any, evt: Event) => {
          const id: Ref<Document> = generateId()
          await createEmptyDocument(client, id, doc.space, doc._id, {})

          const object = await client.findOne(document.class.Document, { _id: id })
          if (object !== undefined) {
            openDoc(client.getHierarchy(), object)
          }
        }
      }
    ]
  }

  async function getMoreActions (obj: Document): Promise<Action[]> {
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

<TreeNode
  _id={space?._id}
  icon={space?.icon === view.ids.IconWithEmoji ? IconWithEmoji : space?.icon ?? model.icon}
  iconProps={space?.icon === view.ids.IconWithEmoji
    ? { icon: space.color }
    : {
        fill:
          space.color !== undefined
            ? getPlatformColorDef(space.color, $themeStore.dark).icon
            : getPlatformColorForTextDef(space.name, $themeStore.dark).icon
      }}
  title={space.name}
  type={'nested'}
  highlighted={currentSpace === space._id}
  visible={currentSpace === space._id || forciblyСollapsed}
  actions={() => getActions(space)}
  {forciblyСollapsed}
>
  <DocHierarchy {documents} {descendants} {documentById} {selected} />

  <svelte:fragment slot="visible">
    {#if (selected || forciblyСollapsed) && visibleItem}
      {@const item = visibleItem}
      <DocTreeElement
        doc={item}
        icon={item.icon === view.ids.IconWithEmoji ? IconWithEmoji : item.icon ?? document.icon.Document}
        iconProps={item.icon === view.ids.IconWithEmoji
          ? { icon: visibleItem.color }
          : {
              fill: item.color !== undefined ? getPlatformColorDef(item.color, $themeStore.dark).icon : 'currentColor'
            }}
        title={item.name}
        selected
        isFold
        empty
        shouldTooltip
        actions={getDocActions(item)}
        moreActions={() => getMoreActions(item)}
        forciblyСollapsed
      />
    {/if}
  </svelte:fragment>
</TreeNode>
