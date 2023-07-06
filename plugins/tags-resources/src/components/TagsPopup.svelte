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
  import presentation, { createQuery, getClient } from '@hcengineering/presentation'
  import { TagCategory, TagElement } from '@hcengineering/tags'
  import {
    Button,
    EditWithIcon,
    Icon,
    IconAdd,
    IconCheck,
    IconSearch,
    Label,
    deviceOptionsStore,
    getPlatformColorDef,
    resizeObserver,
    showPopup,
    themeStore
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tags from '../plugin'
  import CreateTagElement from './CreateTagElement.svelte'
  import IconView from './icons/View.svelte'
  import IconViewHide from './icons/ViewHide.svelte'

  export let newElements: TagElement[] = []
  export let targetClass: Ref<Class<Doc>>
  export let placeholder: IntlString = presentation.string.Search
  export let placeholderParam: any | undefined = undefined
  export let selected: Ref<TagElement>[] = []
  export let keyLabel: string = ''
  export let hideAdd: boolean = false

  const tagShowLimit = 50

  let search: string = ''
  let show: boolean = false
  let objects: TagElement[] = []
  let categories: TagCategory[] = []
  let isSingleCategory = true

  const dispatch = createEventDispatcher()
  const query = createQuery()

  const client = getClient()
  client.findAll(tags.class.TagCategory, { targetClass }).then((res) => {
    categories = res
    isSingleCategory = categories.length <= 1
  })

  // TODO: Add $not: {$in: []} query
  $: query.query(tags.class.TagElement, { title: { $like: '%' + search + '%' }, targetClass }, (result) => {
    objects = newElements.concat(result)
  })

  async function createTagElement (): Promise<void> {
    showPopup(CreateTagElement, { targetClass }, 'top')
  }

  const isSelected = (selected: Ref<TagElement>[], element: TagElement): boolean => {
    if (selected.filter((p) => p === element._id).length > 0) return true
    return false
  }
  const checkSelected = (_selected: Ref<TagElement>[], element: TagElement): void => {
    if (isSelected(_selected, element)) {
      selected = _selected.filter((p) => p !== element._id)
      dispatch('update', { action: 'remove', tag: element })
    } else {
      selected = [..._selected, element._id]
      dispatch('update', { action: 'add', tag: element })
    }
    dispatch('update', { action: 'selected', selected })
  }
  const toggleGroup = (ev: MouseEvent): void => {
    const el: HTMLElement = ev.currentTarget as HTMLElement
    el.classList.toggle('show')
  }
  const getCount = (cat: TagCategory): string => {
    const count = objects.filter((el) => el.category === cat._id).filter((it) => selected.includes(it._id)).length
    if (count > 0) return count.toString()
    return ''
  }
  const tagSort = (a: TagElement, b: TagElement) => {
    const r = (b.refCount ?? 0) - (a.refCount ?? 0)
    if (r === 0) {
      return b.title.localeCompare(a.title)
    }
    return r
  }
</script>

<div class="selectPopup maxHeight" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="header flex-row-center gap-2">
    <EditWithIcon
      icon={IconSearch}
      size={'large'}
      width={'100%'}
      autoFocus={!$deviceOptionsStore.isMobile}
      bind:value={search}
      {placeholder}
      {placeholderParam}
      on:change
    />
    {#if !isSingleCategory}
      <Button
        kind={'ghost'}
        size={'large'}
        icon={show ? IconView : IconViewHide}
        on:click={() => {
          show = !show
        }}
      />
    {/if}
    {#if !hideAdd}<Button kind={'ghost'} size={'large'} icon={IconAdd} on:click={createTagElement} />{/if}
  </div>
  <div class="scroll">
    <div class="box">
      {#each categories as cat, i}
        {@const catObjects = objects.filter((el) => el.category === cat._id).sort(tagSort)}
        {#if catObjects.length > 0}
          {#if i > 0}<div class="menu-separator" />{/if}
          <div class="sticky-wrapper">
            <button
              class="menu-group__header"
              class:show={isSingleCategory || search !== '' || show}
              class:hidden={isSingleCategory}
              on:click={toggleGroup}
            >
              <div class="flex-row-center">
                <span class="mr-1-5">{cat.label}</span>
                <div class="icon">
                  <svg fill="var(--theme-content-color)" viewBox="0 0 6 6" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0,0L6,3L0,6Z" />
                  </svg>
                </div>
              </div>
              <div class="flex-row-center text-xs">
                <span class="content-color mr-1">
                  {#if catObjects.length > tagShowLimit}
                    ({tagShowLimit}, {catObjects.length})
                  {:else}
                    ({catObjects.length})
                  {/if}
                </span>
                <span class="counter">
                  {#key selected}
                    {getCount(cat)}
                  {/key}
                </span>
              </div>
            </button>
            <div class="menu-group">
              {#each catObjects.slice(0, 50) as element}
                {@const color = getPlatformColorDef(element.color, $themeStore.dark)}
                <button
                  class="menu-item no-focus flex-row-center"
                  class:selected={isSelected(selected, element)}
                  on:click={() => {
                    checkSelected(selected, element)
                  }}
                >
                  <div class="tag" style:background-color={color.color} />
                  <span class="lines-limit-2 flex-grow">{element.title}</span>
                  <span class="ml-2 text-xs">
                    ({element.refCount ?? 0})
                  </span>
                  <div class="check ml-3">
                    {#if isSelected(selected, element)}
                      <Icon icon={IconCheck} size={'small'} />
                    {/if}
                  </div>
                </button>
              {/each}
            </div>
          </div>
        {/if}
      {/each}
      {#if objects.length === 0}
        <div class="empty">
          <Label label={tags.string.NoItems} params={{ word: keyLabel }} />
        </div>
      {/if}
    </div>
  </div>
  <div class="menu-space" />
</div>

<style lang="scss">
  .counter {
    margin-top: -0.125rem;
    padding-right: 0.125rem;
    min-width: 1.5rem;
    text-align: right;
    font-size: 0.8125rem;
    color: var(--theme-caption-color);
  }
  .empty {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    font-size: 0.75rem;
    color: var(--theme-dark-color);
  }
  .hidden {
    display: none;
  }
</style>
