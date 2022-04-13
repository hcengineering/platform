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
  import { Class, Data, Doc, generateId, Ref } from '@anticrm/core'
  import { Card, createQuery, getClient } from '@anticrm/presentation'
  import { findTagCategory, TagCategory, TagElement } from '@anticrm/tags'
  import { DropdownLabels, EditBox, getColorNumberByText, getPlatformColor, showPopup, Button, IconFolder } from '@anticrm/ui'
  import { DropdownTextItem } from '@anticrm/ui/src/types'
  import { ColorsPopup } from '@anticrm/view-resources'
  import { createEventDispatcher } from 'svelte'
  import tags from '../plugin'
  import { getTagStyle } from '../utils'

  export let targetClass: Ref<Class<Doc>>
  export let keyTitle: string = ''

  let title = ''
  let description = ''
  let color: number = 0

  let categoryWasSet = false
  let category: Ref<TagCategory> | undefined

  let categories: TagCategory[] = []
  let categoryItems: DropdownTextItem[] = []

  let colorSet = false

  $: if (!colorSet) {
    color = getColorNumberByText(title)
  }

  $: if (!categoryWasSet && categories.length > 0) {
    category = findTagCategory(title, categories)
  }

  export function canClose (): boolean {
    return title === ''
  }

  const dispatch = createEventDispatcher()
  const client = getClient()
  const tagElementId = generateId()

  const query = createQuery()

  query.query(tags.class.TagCategory, { targetClass }, async (result) => {
    const newItems: DropdownTextItem[] = []
    for (const r of result) {
      newItems.push({
        id: r._id,
        label: r.label
      })
    }
    categories = result
    categoryItems = newItems
  })

  async function createTagElenent () {
    const tagElement: Data<TagElement> = {
      title: title,
      description,
      targetClass,
      color,
      category: category ?? tags.category.NoCategory
    }

    await client.createDoc(tags.class.TagElement, tags.space.Tags, tagElement, tagElementId)
    dispatch('close')
  }
</script>

<Card
  label={tags.string.AddTag}
  labelProps={{ word: keyTitle }}
  okAction={createTagElenent}
  canSave={title.length > 0}
  space={tags.space.Tags}
  createMore={false}
  on:close={() => {
    dispatch('close')
  }}
>
  <div class="flex-row-top clear-mins">
    <div class="mr-3">
      <Button
        size={'medium'}
        kind={'link-bordered'}
        on:click={(evt) => {
          showPopup(ColorsPopup, {}, evt.target, (col) => {
            if (col != null) {
              color = col
              colorSet = true
            }
          })
        }}
      >
        <svelte:fragment slot="content">
          <div class="color" style={getTagStyle(getPlatformColor(color))} />
        </svelte:fragment>
      </Button>
    </div>
    <div class="flex-col mt-0-5">
      <EditBox
        bind:value={title}
        placeholder={tags.string.TagName}
        placeholderParam={{ word: keyTitle }}
        maxWidth={'35rem'} kind={'large-style'} focus
      />
      <div class="mt-2">
        <EditBox
          bind:value={description}
          placeholder={tags.string.TagDescriptionPlaceholder}
          maxWidth={'35rem'} kind={'small-style'}
        />
      </div>
    </div>
  </div>
  <svelte:fragment slot="pool">
    <div class="ml-12">
      <DropdownLabels
        icon={IconFolder}
        label={tags.string.CategoryLabel}
        bind:selected={category}
        items={categoryItems}
        on:selected={() => {
          categoryWasSet = true
        }}
      />
    </div>
  </svelte:fragment>
</Card>

<style lang="scss">
  .color {
    width: 1rem;
    height: 1rem;
    border-radius: .25rem;
  }
</style>
