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
  import { Ref, SortingOrder, Space } from '@hcengineering/core'
  import { Document, Teamspace } from '@hcengineering/document'
  import { createQuery } from '@hcengineering/presentation'
  import {
    IconWithEmoji,
    getTreeCollapsed,
    setTreeCollapsed,
    getPlatformColorDef,
    getPlatformColorForTextDef,
    themeStore,
    Action
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { TreeNode } from '@hcengineering/view-resources'
  import { SpacesNavModel } from '@hcengineering/workbench'

  import document from '../../plugin'
  import { getDocumentIdFromFragment } from '../../utils'
  import DocHierarchy from './DocHierarchy.svelte'

  export let space: Teamspace
  export let model: SpacesNavModel
  export let currentSpace: Ref<Space> | undefined
  export let currentSpecial: string | undefined
  export let currentFragment: string | undefined
  export let getActions: (space: Space) => Promise<Action[]> = async () => []
  export let deselect: boolean = false

  let collapsed: boolean = getTreeCollapsed(space._id)
  $: setTreeCollapsed(space._id, collapsed)

  let documents: Ref<Document>[] = []
  let documentById: Map<Ref<Document>, Document> = new Map<Ref<Document>, Document>()
  let descendants: Map<Ref<Document>, Document[]> = new Map<Ref<Document>, Document[]>()

  function getDescendants (obj: Ref<Document>): Ref<Document>[] {
    return (descendants.get(obj) ?? []).sort((a, b) => a.name.localeCompare(b.name)).map((p) => p._id)
  }

  let selected: Ref<Document> | undefined
  $: selected = getDocumentIdFromFragment(currentFragment ?? '')

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
</script>

<TreeNode
  {collapsed}
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
  folder
  parent={descendants.size > 0}
  actions={() => getActions(space)}
  on:click={() => (collapsed = !collapsed)}
>
  <DocHierarchy {documents} {descendants} {documentById} {selected} />
</TreeNode>
