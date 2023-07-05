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
  import type { AttachedDoc, Class, Collection, Doc, Ref } from '@hcengineering/core'
  import { translate } from '@hcengineering/platform'
  import { KeyedAttribute } from '@hcengineering/presentation'
  import { TagElement, TagReference } from '@hcengineering/tags'
  import {
    Button,
    getEventPopupPositionElement,
    IconAdd,
    IconClose,
    Label,
    ShowMore,
    showPopup,
    themeStore
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tags from '../plugin'
  import TagItem from './TagItem.svelte'
  import TagsPopup from './TagsPopup.svelte'
  import WeightPopup from './WeightPopup.svelte'

  export let items: TagReference[] = []
  export let targetClass: Ref<Class<Doc>>
  export let key: KeyedAttribute
  export let showTitle = true
  export let elements: Map<Ref<TagElement>, TagElement>
  export let schema: '0' | '3' | '9' = key.attr.schema ?? '0'

  const dispatch = createEventDispatcher()

  let keyLabel: string = ''

  $: itemLabel = (key.attr.type as Collection<AttachedDoc>).itemLabel

  $: translate(itemLabel ?? key.attr.label, {}, $themeStore.language).then((v) => {
    keyLabel = v
  })

  $: expert = items.filter((it) => (it.weight ?? 0) >= 6 && (it.weight ?? 0) <= 8)
  $: meaningfull = items.filter((it) => (it.weight ?? 0) >= 3 && (it.weight ?? 0) <= 5)
  $: initial = items.filter((it) => (it.weight ?? 1) >= 0 && (it.weight ?? 0) <= 2)

  $: categories = [
    { items: expert, label: tags.string.Expert },
    { items: meaningfull, label: tags.string.Meaningfull },
    { items: initial, label: tags.string.Initial }
  ]

  async function addRef (tag: TagElement): Promise<void> {
    dispatch('open', tag)
  }
  async function addTag (evt: Event): Promise<void> {
    showPopup(
      TagsPopup,
      {
        targetClass,
        selected: items.map((it) => it.tag),
        keyLabel,
        hideAdd: false
      },
      evt.target as HTMLElement,
      () => {},
      (result) => {
        if (result !== undefined) {
          if (result.action === 'add') addRef(result.tag)
          else if (result.action === 'remove') removeTag(items.filter((it) => it.tag === result.tag._id)[0]._id)
        }
      }
    )
  }

  async function removeTag (id: Ref<TagReference>): Promise<void> {
    dispatch('delete', id)
  }
</script>

<div class="antiSection">
  {#if showTitle}
    <div class="antiSection-header">
      <span class="antiSection-header__title">
        <Label label={key.attr.label} />
      </span>
      <div class="buttons-group x-small">
        <Button
          icon={IconAdd}
          kind={'ghost'}
          showTooltip={{ label: tags.string.AddTagTooltip, props: { word: keyLabel } }}
          id={'add-tag'}
          on:click={addTag}
        />
      </div>
    </div>
  {/if}
  <ShowMore ignore={!showTitle}>
    <div
      class:tags-container={showTitle}
      class:antiComponent={showTitle}
      class:antiEmphasized={showTitle}
      class:mt-3={showTitle}
      class:empty={items.length === 0}
    >
      <div class="flex flex-grow flex-col" class:tag-items-scroll={!showTitle}>
        {#if items.length === 0}
          {#if keyLabel}
            <div class="text-sm content-dark-color w-full flex-center">
              <Label label={tags.string.NoItems} params={{ word: keyLabel }} />
            </div>
          {/if}
        {/if}
        {#each categories as cat, ci}
          {#if cat.items.length > 0}
            <div class="text-sm mb-1" class:mt-2={ci > 0 && categories[ci - 1].items.length > 0}>
              <Label label={cat.label} />
            </div>
          {/if}
          <div class="flex flex-grow flex-wrap">
            {#each cat.items as tag}
              <TagItem
                {tag}
                element={elements.get(tag.tag)}
                {schema}
                action={IconClose}
                on:action={() => {
                  removeTag(tag._id)
                }}
                on:click={(evt) => {
                  if (schema !== '0') {
                    showPopup(
                      WeightPopup,
                      { value: tag.weight ?? 1, format: 'number', schema },
                      getEventPopupPositionElement(evt),
                      (res) => {
                        if (Number.isFinite(res) && res >= 0 && res <= 8) {
                          if (res != null) {
                            dispatch('change', { tag, weight: res })
                          }
                        }
                      }
                    )
                  }
                }}
              />
            {/each}
          </div>
        {/each}
      </div>
    </div>
  </ShowMore>
</div>

<style lang="scss">
  .tags-container {
    &.empty {
      background-color: transparent;
    }
  }
  .tag-items-scroll {
    overflow-y: scroll;
    max-height: 20rem;
  }
</style>
