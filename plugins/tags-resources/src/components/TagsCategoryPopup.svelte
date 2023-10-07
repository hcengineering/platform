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
  import type { IntlString } from '@hcengineering/platform'
  import { translate } from '@hcengineering/platform'
  import presentation, { createQuery } from '@hcengineering/presentation'
  import { TagCategory, TagElement } from '@hcengineering/tags'
  import {
    Button,
    CheckBox,
    Icon,
    IconClose,
    Label,
    getPlatformColorDef,
    resizeObserver,
    themeStore
  } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import tags from '../plugin'

  export let targetClass: Ref<Class<Doc>>
  export let placeholder: IntlString = presentation.string.Search
  export let selected: Ref<TagElement>[] = []
  export let keyLabel: string = ''
  export let category: TagCategory

  let elements: TagElement[] = []

  let search: string = ''
  let searchElement: HTMLInputElement

  const dispatch = createEventDispatcher()
  const query = createQuery()

  let phTraslate: string = ''
  $: if (placeholder) {
    translate(placeholder, {}, $themeStore.language).then((res) => {
      phTraslate = res
    })
  }

  $: query.query(
    tags.class.TagElement,
    { title: { $like: '%' + search + '%' }, targetClass, category: category._id },
    (result) => {
      elements = result
    },
    { limit: 200 }
  )

  const isSelected = (element: TagElement, selected: Ref<TagElement>[]): boolean => {
    if (selected.filter((p) => p === element._id).length > 0) return true
    return false
  }
  const checkSelected = (element: TagElement, _selected: Ref<TagElement>[]): void => {
    if (isSelected(element, _selected)) {
      selected = selected.filter((p) => p !== element._id)
    } else {
      selected = [...selected, element._id]
    }
  }

  onMount(() => {
    if (searchElement) searchElement.focus()
  })

  type TagElementInfo = { count: number; modifiedOn: number }
  let tagElements: Map<Ref<TagElement>, TagElementInfo> | undefined
  const refQuery = createQuery()
  $: refQuery.query(
    tags.class.TagReference,
    { tag: { $in: elements.map((it) => it._id) } },
    (res) => {
      const result = new Map<Ref<TagElement>, TagElementInfo>()

      for (const d of res) {
        const v = result.get(d.tag) ?? { count: 0, modifiedOn: 0 }
        v.count++
        v.modifiedOn = Math.max(v.modifiedOn, d.modifiedOn)
        result.set(d.tag, v)
      }

      tagElements = result
    },
    {
      projection: {
        _id: 1,
        tag: 1,
        modifiedOn: 1
      }
    }
  )
</script>

<div class="selectPopup maxHeight" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="header no-border">
    <div class="flex-between flex-grow pr-2">
      <div class="flex-grow">
        <input
          bind:this={searchElement}
          type="text"
          bind:value={search}
          placeholder={phTraslate}
          style="width: 100%;"
          on:change
        />
      </div>
      <div class="buttons-group small-gap">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          class="clear-btn"
          class:show={search !== ''}
          on:click={() => {
            search = ''
            searchElement.focus()
          }}
        >
          {#if search !== ''}<div class="icon"><Icon icon={IconClose} size={'inline'} /></div>{/if}
        </div>
      </div>
    </div>
  </div>
  <div class="scroll">
    <div class="box">
      {#if elements.length > 0}
        <div class="sticky-wrapper">
          <div class="menu-group" style:overflow="visible">
            {#each elements.filter((it) => tagElements?.has(it._id)) as element}
              {@const color = getPlatformColorDef(element.color, $themeStore.dark)}
              <button
                class="menu-item"
                on:click={() => {
                  checkSelected(element, selected)
                }}
              >
                <div class="check pointer-events-none">
                  <CheckBox checked={isSelected(element, selected)} kind={'accented'} />
                </div>
                <div class="tag" style="background-color: {color.background};" />
                <span style:color={color.title}>
                  {element.title}
                  {#if (tagElements?.get(element._id)?.count ?? 0) > 0}
                    ({tagElements?.get(element._id)?.count})
                  {/if}
                </span>
              </button>
            {/each}
          </div>
        </div>
      {/if}
      {#if elements.length === 0}
        <div class="empty">
          <Label label={tags.string.NoItems} params={{ word: keyLabel }} />
        </div>
      {/if}
    </div>
  </div>
  <div class="flex-between p-2">
    <Button
      kind={'ghost'}
      label={tags.string.SelectAll}
      on:click={() => {
        selected = elements.map((it) => it._id)
      }}
    />
    <Button
      kind={'ghost'}
      label={tags.string.SelectNone}
      on:click={() => {
        selected = []
      }}
    />
  </div>
  <Button
    shape={'round'}
    label={tags.string.ApplyTags}
    on:click={() =>
      dispatch(
        'close',
        elements.filter((it) => selected.includes(it._id))
      )}
  />
</div>

<style lang="scss">
  .empty {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    font-size: 0.75rem;
    color: var(--dark-color);
    border-top: 1px solid var(--popup-divider);
  }
</style>
