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
  import { Ref } from '@hcengineering/core'
  import { Document, Teamspace } from '@hcengineering/document'
  import presentation, { Card, getClient, SpaceSelector } from '@hcengineering/presentation'
  import view from '@hcengineering/view'
  import { ObjectBox } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import document from '../plugin'
  import TeamspacePresenter from './teamspace/TeamspacePresenter.svelte'
  import { moveDocument } from '../utils'

  export let value: Document

  const client = getClient()
  const dispatch = createEventDispatcher()

  let space: Ref<Teamspace> = value.space
  let parent: Ref<Document> = value.attachedTo

  let children: Ref<Document>[] = []
  $: void updateChildren(value)

  async function updateChildren (doc: Document): Promise<void> {
    children = await findChildren(doc)
  }

  async function save (): Promise<void> {
    const ops = client.apply(value._id)

    await moveDocument(value, space, parent ?? document.ids.NoParent)

    if (space !== value.space) {
      const children = await findChildren(value)
      for (const child of children) {
        await client.updateDoc(document.class.Document, value.space, child, {
          space
        })
      }
    }

    await ops.commit()
  }

  async function findChildren (doc: Document): Promise<Array<Ref<Document>>> {
    const documents = await client.findAll(
      document.class.Document,
      { space: doc.space, attachedTo: { $ne: document.ids.NoParent } },
      { projection: { _id: 1, attachedTo: 1 } }
    )

    const byParent = new Map<Ref<Document>, Array<Ref<Document>>>()
    for (const document of documents) {
      const group = byParent.get(document.attachedTo) ?? []
      group.push(document._id)
      byParent.set(document.attachedTo, group)
    }

    const result: Ref<Document>[] = []

    const queue = [doc._id]
    while (true) {
      const next = queue.pop()
      if (next === undefined) break
      const children = byParent.get(next) ?? []
      result.push(...children)
      queue.push(...children)
    }

    return result
  }

  $: canSave = space !== value.space || parent !== value.attachedTo
</script>

<Card
  label={view.string.Move}
  okAction={save}
  okLabel={presentation.string.Save}
  fullSize
  {canSave}
  on:close={() => dispatch('close')}
  on:changeContent
>
  <div class="flex-row-center gap-2 min-w-100">
    <SpaceSelector
      bind:space
      _class={document.class.Teamspace}
      label={document.string.Teamspace}
      component={TeamspacePresenter}
      iconWithEmoji={view.ids.IconWithEmoji}
      defaultIcon={document.icon.Teamspace}
      kind={'regular'}
      size={'small'}
      on:change={() => {
        parent = document.ids.NoParent
      }}
    />
    <ObjectBox
      bind:value={parent}
      _class={document.class.Document}
      label={document.string.NoParentDocument}
      docQuery={{ space }}
      kind={'regular'}
      size={'small'}
      searchField={'name'}
      allowDeselect={true}
      showNavigate={false}
      docProps={{ disabled: true, noUnderline: true }}
      excluded={[value._id, ...children]}
    />
  </div>
</Card>
