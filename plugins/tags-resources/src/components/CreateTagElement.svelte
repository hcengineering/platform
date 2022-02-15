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
  import { Card, getClient } from '@anticrm/presentation'
  import { TagElement } from '@anticrm/tags'
  import { EditBox, getColorNumberByText, getPlatformColor, showPopup } from '@anticrm/ui'
  import { ColorsPopup } from '@anticrm/view-resources'
  import { createEventDispatcher } from 'svelte'
  import tags from '../plugin'
  import { getTagStyle } from '../utils'

  export let targetClass: Ref<Class<Doc>>
  export let keyTitle: string = ''

  let title = ''
  let description = ''
  let color: number = 0

  let colorSet = false

  $: if (!colorSet) {
    color = getColorNumberByText(title)
  }

  export function canClose (): boolean {
    return title === ''
  }

  const dispatch = createEventDispatcher()
  const client = getClient()
  const tagElementId = generateId()

  async function createTagElenent () {
    const tagElement: Data<TagElement> = {
      title: title,
      description,
      targetClass,
      color
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
  on:close={() => {
    dispatch('close')
  }}
>
  <div class="flex-row-center">
    <div class="flex-col">
      <div class="fs-title flex-row-center">
        <div
          class="color"
          style={getTagStyle(getPlatformColor(color))}
          on:click={(evt) => {
            showPopup(ColorsPopup, {}, evt.target, (col) => {
              if (col != null) {
                color = col
                colorSet = true
              }
            })
          }}
        />
        <EditBox
          focus
          placeholder={tags.string.TagName}
          placeholderParam={{ word: keyTitle }}
          maxWidth="10rem"
          bind:value={title}
        />
      </div>

      <div class="text-sm mt-4">
        <EditBox placeholder={tags.string.TagDescriptionPlaceholder} maxWidth="15rem" bind:value={description} />
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
