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
  import { Class, Doc, Ref } from '@anticrm/core'
  import type { IntlString } from '@anticrm/platform'
  import { createQuery } from '@anticrm/presentation'
  import { TagElement } from '@anticrm/tags'
  import ui, { ActionIcon, Button, EditWithIcon, IconAdd, IconSearch, Label, showPopup } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import tags from '../plugin'
  import CreateTagElement from './CreateTagElement.svelte'
  import TagItem from './TagItem.svelte'

  export let targetClass: Ref<Class<Doc>>
  export let title: string
  export let caption: IntlString = ui.string.Suggested
  export let addRef: (tag: TagElement) => Promise<void>
  export let selected: Ref<TagElement>[] = []

  let search: string = ''
  let objects: TagElement[] = []
  let available: TagElement[] = []

  const dispatch = createEventDispatcher()
  const query = createQuery()

  // TODO: Add $not: {$in: []} query
  $: query.query(
    tags.class.TagElement,
    { title: { $like: '%' + search + '%' }, targetClass },
    (result) => {
      objects = result
    },
    { limit: 200 }
  )

  $: available = objects.filter((it) => !selected.includes(it._id))

  let anchor: HTMLElement
  async function createTagElement (): Promise<void> {
    showPopup(CreateTagElement, { targetClass, keyTitle: title }, anchor)
  }
  async function addTag (element: TagElement): Promise<void> {
    await addRef(element)
    selected = [...selected, element._id]
  }
</script>

<div class="antiPopup antiPopup-withHeader antiPopup-withTitle">
  <div class="ap-title">
    <Label label={tags.string.AddTagTooltip} params={{ word: title }} />
  </div>
  <div class="ap-header">
    <EditWithIcon icon={IconSearch} bind:value={search} placeholder={tags.string.SearchCreate} focus>
      <svelte:fragment slot="extra">
        <div id='new-tag' class="ml-27" bind:this={anchor}>
          <ActionIcon
            label={tags.string.AddNowTooltip}
            labelProps={{ word: title }}
            icon={IconAdd}
            action={createTagElement}
            size={'small'}
          />
        </div>
      </svelte:fragment>
    </EditWithIcon>
    <div class="ap-caption">
      <Label label={caption} />
    </div>
  </div>
  <div class="ap-space" />
  <div class="ap-scroll">
    <div class="flex flex-wrap" style={'max-height: 15rem;'}>
      {#each available as element}
        <div
          class="hover-trans"
          on:click={() => {
            addTag(element)
          }}
        >
          <div class="flex-between">
            <TagItem
              {element}
              action={IconAdd}
              on:action={() => {
                addTag(element)
              }}
            />
          </div>
        </div>
      {/each}
    </div>
  </div>
  <div class="ap-footer">
    <Button
      label={tags.string.CancelLabel}
      size={'small'}
      on:click={() => {
        dispatch('close')
      }}
    />
  </div>
</div>
