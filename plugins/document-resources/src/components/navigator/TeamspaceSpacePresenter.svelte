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
  import { Analytics } from '@hcengineering/analytics'
  import { Ref, SortingOrder, Space, generateId } from '@hcengineering/core'
  import { Document, DocumentEvents, Teamspace } from '@hcengineering/document'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import {
    IconWithEmoji,
    IconEdit,
    getPlatformColorDef,
    getPlatformColorForTextDef,
    themeStore,
    Action,
    IconAdd,
    closeTooltip
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { TreeNode, openDoc, getActions as getContributedActions } from '@hcengineering/view-resources'
  import { SpacesNavModel } from '@hcengineering/workbench'
  import { getResource } from '@hcengineering/platform'

  import document from '../../plugin'
  import {
    getDocumentIdFromFragment,
    createEmptyDocument,
    moveDocument,
    moveDocumentBefore,
    moveDocumentAfter
  } from '../../utils'
  import DocHierarchy from './DocHierarchy.svelte'
  import DocTreeElement from './DocTreeElement.svelte'
  import DropArea from './DropArea.svelte'
  import DropMarker from './DropMarker.svelte'

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
    return (descendants.get(obj) ?? []).sort((a, b) => a.rank.localeCompare(b.rank)).map((p) => p._id)
  }

  function getAllDescendants (obj: Ref<Document>): Ref<Document>[] {
    const result: Ref<Document>[] = []
    const queue: Ref<Document>[] = [obj]

    while (queue.length > 0) {
      const next = queue.pop()
      if (next === undefined) break

      const children = descendants.get(next) ?? []
      const childrenRefs = children.map((p) => p._id)
      result.push(...childrenRefs)
      queue.push(...childrenRefs)
    }

    return result
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
        rank: SortingOrder.Ascending
      }
    }
  )

  function getDocActions (doc: Document): Action[] {
    return [
      {
        icon: IconAdd,
        label: document.string.CreateDocument,
        action: async (ctx: any, evt: Event) => {
          Analytics.handleEvent(DocumentEvents.PlusDocumentButtonClicked, { parent: doc._id })
          const id: Ref<Document> = generateId()
          await createEmptyDocument(client, id, doc.space, doc._id, {})
          Analytics.handleEvent(DocumentEvents.DocumentCreated, { id, parent: doc._id })
          const object = await client.findOne(document.class.Document, { _id: id })
          if (object !== undefined) {
            void openDoc(client.getHierarchy(), object)
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

  let parent: HTMLElement
  let draggedItem: Ref<Document> | undefined = undefined
  let draggedOver: Ref<Document> | undefined = undefined
  let draggedOverPos: 'before' | 'after' | undefined = undefined
  let draggedOverTop: number = 0
  let cannotDropTo: Ref<Document>[] = []

  function canDrop (object: Ref<Document>, target: Ref<Document>): boolean {
    if (object === target) return false
    if (cannotDropTo.includes(target)) return false

    return true
  }

  function onDragStart (event: DragEvent, object: Ref<Document>): void {
    // no prevent default to leverage default rendering
    // event.preventDefault()
    if (event.dataTransfer === null || event.target === null) {
      return
    }

    cannotDropTo = [object, ...getAllDescendants(object)]

    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.dropEffect = 'move'
    draggedItem = object

    closeTooltip()
  }

  function getDropPosition (event: DragEvent): { pos: 'before' | 'after' | undefined, top: number } {
    const parentRect = parent.getBoundingClientRect()
    const targetRect = (event.target as HTMLElement).getBoundingClientRect()
    const dropPosition = event.clientY - targetRect.top

    const before = dropPosition >= 0 && dropPosition < targetRect.height / 6
    const after = dropPosition <= targetRect.height && dropPosition > (5 * targetRect.height) / 6

    const pos = before ? 'before' : after ? 'after' : undefined
    const top = pos === 'before' ? targetRect.top - parentRect.top - 1 : targetRect.bottom - parentRect.top - 1

    return { pos, top }
  }

  function onDragOver (event: DragEvent, object: Ref<Document>): void {
    event.preventDefault()
    // this is an ugly solution to control drop effect
    // we drag and drop elements that are in the depth of components hierarchy
    // so we cannot access them directly
    if (!(event.target as HTMLElement).draggable) return
    if (event.dataTransfer === null || event.target === null || draggedItem === object) {
      return
    }

    if (draggedItem !== undefined && canDrop(draggedItem, object)) {
      event.dataTransfer.dropEffect = 'move'
      draggedOver = object

      const { pos, top } = getDropPosition(event)
      draggedOverPos = pos
      draggedOverTop = top
    } else {
      event.dataTransfer.dropEffect = 'none'
    }
  }

  function onDragEnd (event: DragEvent): void {
    event.preventDefault()
    draggedItem = undefined
    draggedOver = undefined
    draggedOverPos = undefined
  }

  function onDrop (event: DragEvent, object: Ref<Document>): void {
    event.preventDefault()
    if (event.dataTransfer === null) {
      return
    }
    if (draggedItem !== undefined && canDrop(draggedItem, object)) {
      const doc = documentById.get(draggedItem)
      const target = documentById.get(object)

      if (doc !== undefined && doc._id !== object) {
        if (object === document.ids.NoParent) {
          void moveDocument(doc, doc.space, document.ids.NoParent)
        } else if (target !== undefined) {
          const { pos } = getDropPosition(event)
          if (pos === 'before') {
            void moveDocumentBefore(doc, target)
          } else if (pos === 'after') {
            void moveDocumentAfter(doc, target)
          } else if (doc.attachedTo !== object) {
            void moveDocument(doc, target.space, target._id)
          }
        }
      }
    }
    draggedItem = undefined
    draggedOver = undefined
  }
</script>

<div bind:this={parent} class="flex-col relative">
  {#if draggedOver === document.ids.NoParent}
    <DropArea />
  {/if}

  {#if draggedOver && draggedOverPos}
    <DropMarker top={draggedOverTop} />
  {/if}

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
    selected={draggedOver === document.ids.NoParent}
    {forciblyСollapsed}
    draggable
    on:drop={(evt) => {
      onDrop(evt, document.ids.NoParent)
    }}
    on:dragover={(evt) => {
      onDragOver(evt, document.ids.NoParent)
    }}
    on:dragstart={(evt) => {
      evt.preventDefault()
    }}
  >
    <DocHierarchy
      {documents}
      {descendants}
      {documentById}
      {selected}
      {onDragStart}
      {onDragEnd}
      {onDragOver}
      {onDrop}
      {draggedItem}
      {draggedOver}
    />
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
</div>
