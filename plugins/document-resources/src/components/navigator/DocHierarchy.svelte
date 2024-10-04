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
  import { Ref, generateId } from '@hcengineering/core'
  import { Document } from '@hcengineering/document'
  import { getResource } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Action, IconAdd, IconEdit, IconWithEmoji, getPlatformColorDef, themeStore } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { getActions as getContributedActions, openDoc } from '@hcengineering/view-resources'

  import document from '../../plugin'
  import { createEmptyDocument } from '../../utils'

  import DropArea from './DropArea.svelte'
  import DocTreeElement from './DocTreeElement.svelte'

  export let documents: Ref<Document>[]
  export let descendants: Map<Ref<Document>, Document[]>
  export let documentById: Map<Ref<Document>, Document>

  export let selected: Ref<Document> | undefined
  export let level: number = 0

  export let onDragStart: (e: DragEvent, object: Ref<Document>) => void
  export let onDragOver: (e: DragEvent, object: Ref<Document>) => void
  export let onDragEnd: (e: DragEvent, object: Ref<Document>) => void
  export let onDrop: (e: DragEvent, object: Ref<Document>) => void

  export let draggedItem: Ref<Document> | undefined
  export let draggedOver: Ref<Document> | undefined

  const client = getClient()
  const dispatch = createEventDispatcher()

  function getDescendants (obj: Ref<Document>): Ref<Document>[] {
    return (descendants.get(obj) ?? []).sort((a, b) => a.rank.localeCompare(b.rank)).map((p) => p._id)
  }

  function getActions (doc: Document): Action[] {
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

  function handleDocumentSelected (obj: Ref<Document>): void {
    dispatch('selected', obj)
  }

  $: _documents = documents.map((it) => documentById.get(it)).filter((it) => it !== undefined) as Document[]
  $: _descendants = new Map(_documents.map((it) => [it._id, getDescendants(it._id)]))
</script>

{#each _documents as doc}
  {#if doc}
    {@const desc = _descendants.get(doc._id) ?? []}
    {@const isDraggedOver = draggedOver === doc._id}
    <div class="flex-col relative">
      {#if isDraggedOver}
        <DropArea />
      {/if}

      <DocTreeElement
        {doc}
        icon={doc.icon === view.ids.IconWithEmoji ? IconWithEmoji : doc.icon ?? document.icon.Document}
        iconProps={doc.icon === view.ids.IconWithEmoji
          ? { icon: doc.color }
          : {
              fill: doc.color !== undefined ? getPlatformColorDef(doc.color, $themeStore.dark).icon : 'currentColor'
            }}
        title={doc.title}
        selected={selected === doc._id && draggedItem === undefined}
        isFold
        {level}
        empty={desc.length === 0}
        actions={getActions(doc)}
        moreActions={() => getMoreActions(doc)}
        shouldTooltip
        on:click={() => {
          handleDocumentSelected(doc._id)
        }}
        on:dragstart={(evt) => {
          onDragStart(evt, doc._id)
        }}
        on:dragover={(evt) => {
          onDragOver(evt, doc._id)
        }}
        on:dragend={(evt) => {
          onDragEnd(evt, doc._id)
        }}
        on:drop={(evt) => {
          onDrop(evt, doc._id)
        }}
      >
        {#if desc.length}
          <svelte:self
            documents={desc}
            {descendants}
            {documentById}
            {selected}
            level={level + 1}
            {onDragStart}
            {onDragOver}
            {onDragEnd}
            {onDrop}
            {draggedItem}
            {draggedOver}
            on:selected
          />
        {/if}
      </DocTreeElement>
    </div>
  {/if}
{/each}
