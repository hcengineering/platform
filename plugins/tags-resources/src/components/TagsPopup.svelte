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
  import { translate } from '@anticrm/platform'
  import presentation, { createQuery, getClient } from '@anticrm/presentation'
  import { TagCategory, TagElement, TagReference } from '@anticrm/tags'
  import { CheckBox, Button, Icon, IconAdd, IconClose, Label, showPopup, getPlatformColor } from '@anticrm/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import tags from '../plugin'
  import CreateTagElement from './CreateTagElement.svelte'
  import IconView from './icons/View.svelte'
  import IconViewHide from './icons/ViewHide.svelte'

  export let newElements: TagElement[] = []
  export let targetClass: Ref<Class<Doc>>
  export let placeholder: IntlString = presentation.string.Search
  export let selected: Ref<TagElement>[] = []
  export let keyLabel: string = ''
  export let hideAdd: boolean = false

  let search: string = ''
  let searchElement: HTMLInputElement
  let show: boolean = false
  let objects: TagElement[] = []
  let categories: TagCategory[] = []

  const dispatch = createEventDispatcher()
  const query = createQuery()

  const client = getClient()
  client.findAll(tags.class.TagCategory, { targetClass }).then((res) => { categories = res })

  let phTraslate: string = ''
  $: if (placeholder) translate(placeholder, {}).then(res => { phTraslate = res })

  // TODO: Add $not: {$in: []} query
  $: query.query(
    tags.class.TagElement,
    { title: { $like: '%' + search + '%' }, targetClass },
    (result) => {
      objects = newElements.concat(result)
    },
    { limit: 200 }
  )

  async function createTagElement (): Promise<void> {
    showPopup(CreateTagElement, { targetClass }, 'top')
  }

  const isSelected = (element: TagElement): boolean => {
    if (selected.filter(p => p === element._id).length > 0) return true
    return false
  }
  const checkSelected = (element: TagElement): void => {
    if (isSelected(element)) {
      selected = selected.filter(p => p !== element._id)
      dispatch('update', { action: 'remove', tag: element })
    } else {
      selected = [...selected, element._id]
      dispatch('update', { action: 'add', tag: element })
    }
    objects = objects
    categories = categories
    dispatch('update', { action: 'selected', selected: selected })
  }
  const toggleGroup = (ev: MouseEvent): void => {
    const el: HTMLElement = ev.currentTarget as HTMLElement
    el.classList.toggle('show')
  }
  const getCount = (cat: TagCategory): string => {
    const count = objects.filter(el => el.category === cat._id).filter((it) => selected.includes(it._id)).length
    if (count > 0) return count.toString()
    return ''
  }
  onMount(() => { if (searchElement) searchElement.focus() })
</script>

<div class="selectPopup maxHeight">
  <div class="header no-border">
    <div class="flex-between flex-grow pr-2">
      <div class="flex-grow">
        <input bind:this={searchElement} type="text" bind:value={search} placeholder={phTraslate} style="width: 100%;" on:change/>
      </div>
      <div class="buttons-group small-gap">
        <div class="clear-btn" class:show={search !== ''} on:click={() => {
          search = ''
          searchElement.focus()
        }}>
          {#if search !== ''}<div class="icon"><Icon icon={IconClose} size={'inline'} /></div>{/if}
        </div>
        <Button kind={'transparent'} size={'small'} icon={show ? IconView : IconViewHide} on:click={() => { show = !show }} />
        {#if !hideAdd}<Button kind={'transparent'} size={'small'} icon={IconAdd} on:click={createTagElement} />{/if}
      </div>
    </div>
  </div>
  <div class="scroll">
    <div class="box">
      {#each categories as cat}
        {#if objects.filter(el => el.category === cat._id).length > 0}
          <div class="sticky-wrapper">
            <button class="menu-group__header" class:show={search !== '' || show} on:click={toggleGroup}>
              <div class="flex-row-center">
                <span class="mr-1-5">{cat.label}</span>
                <div class="icon">
                  <svg fill="var(--content-color)" viewBox="0 0 6 6" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0,0L6,3L0,6Z" />
                  </svg>
                </div>
              </div>
              <div class="flex-row-center text-xs">
                <span class="content-color mr-1">({objects.filter(el => el.category === cat._id).length})</span>
                <span class="counter">{getCount(cat)}</span>
              </div>
            </button>
            <div class="menu-group">
              {#each objects.filter(el => el.category === cat._id) as element}
                <button class="menu-item" on:click={() => {
                  checkSelected(element)
                }}>
                  <div class="check pointer-events-none">
                    <CheckBox checked={isSelected(element)} primary />
                  </div>
                  <div class="tag" style="background-color: {getPlatformColor(element.color)};" />
                  {element.title}
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
</div>

<style lang="scss">
  .counter {
    padding-right: .125rem;
    min-width: 1.5rem;
    text-align: right;
    font-size: .8125rem;
    color: var(--caption-color);
  }
  .empty {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    font-size: .75rem;
    color: var(--dark-color);
    border-top: 1px solid var(--popup-divider);
  }
</style>
