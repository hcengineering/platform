<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import core, { Data, DocumentUpdate } from '@hcengineering/core'
  import { Card, createQuery, getClient } from '@hcengineering/presentation'
  import { TagElement, TagReference } from '@hcengineering/tags'
  import {
    DropdownLabels,
    EditBox,
    eventToHTMLElement,
    getPlatformColorDef,
    showPopup,
    themeStore
  } from '@hcengineering/ui'
  import { DropdownTextItem } from '@hcengineering/ui/src/types'
  import { ColorsPopup } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import tags from '../plugin'
  import { getTagStyle } from '../utils'

  export let value: TagElement
  export let keyTitle: string = ''

  const dispatch = createEventDispatcher()
  const client = getClient()

  let categoryItems: DropdownTextItem[] = []

  const data: Omit<Data<TagElement>, 'targetClass'> = {
    title: value.title,
    description: value.description,
    color: value.color,
    category: value.category
  }

  async function updateElement () {
    const documentUpdate: DocumentUpdate<TagElement> = {}
    const refUpdate: DocumentUpdate<TagReference> = {}

    if (data.title !== value.title) {
      documentUpdate.title = data.title
      refUpdate.title = data.title
    }

    if (data.description !== value.description) {
      documentUpdate.description = data.description
    }

    if (data.category !== value.category) {
      documentUpdate.category = data.category
    }

    if (data.color !== value.color) {
      documentUpdate.color = data.color
      refUpdate.color = data.color
    }

    if (Object.keys(documentUpdate).length > 0) {
      await client.update(value, documentUpdate)

      if (Object.keys(refUpdate).length > 0) {
        const references = await client.findAll(tags.class.TagReference, { tag: value._id })
        for (const r of references) {
          const u = client.txFactory.createTxUpdateDoc(r._class, r.space, r._id, refUpdate)
          u.space = core.space.DerivedTx
          await client.tx(u)
        }
      }
    }

    dispatch('close')
  }

  const query = createQuery()
  query.query(tags.class.TagCategory, { targetClass: value.targetClass }, async (result) => {
    const newItems: DropdownTextItem[] = []
    for (const r of result) {
      newItems.push({
        id: r._id,
        label: r.label
      })
    }
    categoryItems = newItems
  })
</script>

<Card
  label={tags.string.EditTag}
  labelProps={{ word: keyTitle }}
  okAction={updateElement}
  canSave={value.title.length > 0}
  on:close={() => {
    dispatch('close')
  }}
  okLabel={tags.string.SaveLabel}
  on:changeContent
>
  <div class="flex-row-center">
    <div class="flex-col">
      <div class="fs-title flex-row-center">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          class="color"
          style={getTagStyle(getPlatformColorDef(data.color, $themeStore.dark))}
          on:click={(evt) => {
            showPopup(
              ColorsPopup,
              { selected: getPlatformColorDef(data.color, $themeStore.dark).name },
              eventToHTMLElement(evt),
              (col) => {
                if (col != null) {
                  data.color = col
                }
              }
            )
          }}
        />
        <EditBox placeholder={tags.string.TagName} placeholderParam={{ word: keyTitle }} bind:value={data.title} />
      </div>

      <div class="fs-title mt-4">
        <EditBox placeholder={tags.string.TagDescriptionPlaceholder} bind:value={data.description} />
      </div>

      <div class="text-sm mt-4">
        <DropdownLabels label={tags.string.CategoryLabel} bind:selected={data.category} items={categoryItems} />
      </div>
    </div>
  </div>
</Card>

<style lang="scss">
  .color {
    margin-right: 0.75rem;
    width: 1rem;
    height: 1rem;
    border-radius: 0.25rem;
    cursor: pointer;
  }
</style>
