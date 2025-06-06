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
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { Card, createQuery } from '@hcengineering/presentation'
  import { findTagCategory, TagCategory } from '@hcengineering/tags'
  import {
    Button,
    DropdownLabels,
    DropdownTextItem,
    EditBox,
    eventToHTMLElement,
    getColorNumberByText,
    getPlatformColorDef,
    IconFolder,
    showPopup,
    themeStore
  } from '@hcengineering/ui'
  import { ColorsPopup } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import tags from '../plugin'
  import { createTagElement, getTagStyle } from '../utils'

  export let targetClass: Ref<Class<Doc>>
  export let keyTitle: string = ''
  export let title: string = ''

  let description = ''
  let color: number = getColorNumberByText(title)

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

  async function createTagElementFnc (): Promise<void> {
    const res = await createTagElement(title, targetClass, category, description, color, keyTitle)
    dispatch('close', res)
  }

  const showColorPopup = (evt: MouseEvent): void => {
    showPopup(
      ColorsPopup,
      { selected: getPlatformColorDef(color, $themeStore.dark).name },
      eventToHTMLElement(evt),
      (col) => {
        if (col != null) {
          color = col
          colorSet = true
        }
      }
    )
  }
</script>

<Card
  label={tags.string.AddTag}
  labelProps={{ word: keyTitle }}
  okAction={createTagElementFnc}
  canSave={title.trim().length > 0}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <div class="flex-row-top clear-mins">
    <div class="mr-3 flex-grow">
      <div class="fs-title flex-row-center">
        <div
          class="color"
          style={getTagStyle(getPlatformColorDef(color, $themeStore.dark))}
          on:click={showColorPopup}
        />
        <EditBox bind:value={title} placeholder={tags.string.TagName} placeholderParam={{ word: keyTitle }} autoFocus />
      </div>

      <div class="fs-title mt-4 flex-grow">
        <EditBox bind:value={description} placeholder={tags.string.TagDescriptionPlaceholder} />
      </div>
      {#if categories.length > 1}
        <div class="text-sm mt-4">
          <DropdownLabels
            icon={IconFolder}
            label={tags.string.CategoryLabel}
            kind={'regular'}
            bind:selected={category}
            items={categoryItems}
            on:selected={() => {
              categoryWasSet = true
            }}
          />
        </div>
      {/if}
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
