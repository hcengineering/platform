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
  import { Class, Doc, FindResult, Ref } from '@hcengineering/core'
  import { translate } from '@hcengineering/platform'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { TagCategory, TagElement } from '@hcengineering/tags'
  import {
    Button,
    CheckBox,
    deviceOptionsStore,
    getEventPopupPositionElement,
    getPlatformColor,
    Label,
    Loading,
    resizeObserver,
    showPopup
  } from '@hcengineering/ui'
  import { Filter } from '@hcengineering/view'
  import { FilterQuery } from '@hcengineering/view-resources'
  import view from '@hcengineering/view-resources/src/plugin'
  import { createEventDispatcher, onMount } from 'svelte'
  import tags from '../plugin'
  import { tagLevel } from '../utils'
  import WeightPopup from './WeightPopup.svelte'

  export let _class: Ref<Class<Doc>>
  export let filter: Filter
  export let onChange: (e: Filter) => void
  filter.onRemove = () => {
    FilterQuery.remove(filter.index)
  }
  const client = getClient()
  let selected: Ref<TagElement>[] = filter.value
  let level: number = filter.props?.level ?? 0

  filter.modes = [tags.filter.FilterTagsIn, tags.filter.FilterTagsNin]
  filter.mode = filter.mode === undefined ? filter.modes[0] : filter.mode

  let categories: TagCategory[] = []
  let objects: TagElement[] = []
  client.findAll(tags.class.TagCategory, { targetClass: _class }).then((res) => {
    categories = res
  })

  let objectsPromise: Promise<FindResult<TagElement>> | undefined

  async function getValues (search: string): Promise<void> {
    if (objectsPromise) {
      await objectsPromise
    }
    const resultQuery =
      search !== ''
        ? {
            title: { $like: '%' + search + '%' },
            targetClass: _class
          }
        : { targetClass: _class }
    objectsPromise = client.findAll(tags.class.TagElement, resultQuery)
    objects = await objectsPromise
    objectsPromise = undefined
  }

  let search: string = ''
  let phTraslate: string = ''
  let searchInput: HTMLInputElement
  $: translate(presentation.string.Search, {}).then((res) => {
    phTraslate = res
  })

  onMount(() => {
    if (searchInput && !$deviceOptionsStore.isMobile) searchInput.focus()
  })

  const toggleGroup = (ev: MouseEvent): void => {
    const el: HTMLElement = ev.currentTarget as HTMLElement
    el.classList.toggle('show')
  }
  $: show = categories.length <= 1

  const getCount = (cat: TagCategory): string => {
    const count = objects.filter((el) => el.category === cat._id).filter((it) => selected.includes(it._id)).length
    if (count > 0) return count.toString()
    return ''
  }

  const isSelected = (element: TagElement): boolean => {
    if (selected.filter((p) => p === element._id).length > 0) return true
    return false
  }

  const checkSelected = (element: TagElement): void => {
    if (isSelected(element)) {
      selected = selected.filter((p) => p !== element._id)
    } else {
      selected = [...selected, element._id]
    }
    objects = objects
    categories = categories
  }

  $: schema = filter.key.attribute.schema ?? '0'

  const dispatch = createEventDispatcher()
  getValues(search)

  $: tagLevelIcon = schema === '3' ? undefined : tagLevel[((level % 3) + 1) as 1 | 2 | 3]
  $: tagLevelLabel = [tags.string.Initial, tags.string.Meaningfull, tags.string.Expert][Math.floor(level / 3)]
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="header">
    <input
      bind:this={searchInput}
      type="text"
      bind:value={search}
      on:change={() => {
        getValues(search)
      }}
      placeholder={phTraslate}
    />
    {#if schema !== '0'}
      <div class="flex-row-center flex-between flex-grow p-1">
        <Label label={tags.string.Weight} />
        <Button
          label={tagLevelLabel}
          icon={tagLevelIcon}
          on:click={(evt) => {
            showPopup(WeightPopup, { value: level, schema }, getEventPopupPositionElement(evt), (res) => {
              if (Number.isFinite(res) && res >= 0 && res <= 8) {
                if (res != null) {
                  level = res
                }
              }
            })
          }}
        />
      </div>
    {/if}
  </div>
  <div class="scroll">
    <div class="box">
      {#if objectsPromise}
        <Loading />
      {:else}
        {#each categories as cat}
          {@const values = objects.filter((el) => el.category === cat._id)}
          {#if values.length > 0}
            <div class="sticky-wrapper">
              <button
                class="menu-group__header"
                class:show={search !== '' || show}
                class:hidden={show}
                on:click={toggleGroup}
              >
                {#if categories.length > 1}
                  <div class="flex-row-center">
                    <span class="mr-1-5">{cat.label}</span>
                    <div class="icon">
                      <svg fill="var(--content-color)" viewBox="0 0 6 6" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0,0L6,3L0,6Z" />
                      </svg>
                    </div>
                  </div>
                  <div class="flex-row-center text-xs">
                    <span class="content-color mr-1">({values.length})</span>
                    <span class="counter">{getCount(cat)}</span>
                  </div>
                {/if}
              </button>
              <div class="menu-group">
                {#each values as element}
                  <button
                    class="menu-item"
                    on:click={() => {
                      checkSelected(element)
                    }}
                  >
                    <div class="flex-between w-full">
                      <div class="flex">
                        <div class="check pointer-events-none">
                          <CheckBox checked={isSelected(element)} primary />
                        </div>
                        <div class="tag" style="background-color: {getPlatformColor(element.color)};" />
                        {element.title}
                      </div>
                      <div class="content-dark-color ml-2">
                        {element.refCount ?? 0}
                      </div>
                    </div>
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        {/each}
      {/if}
    </div>
  </div>
  <Button
    shape={'round'}
    label={view.string.Apply}
    on:click={async () => {
      filter.value = [...selected]
      // Replace last one with value with level
      filter.props = { level }
      onChange(filter)
      dispatch('close')
    }}
  />
</div>

<style>
  .flex {
    display: flex;
    align-items: center;
  }

  .hidden {
    display: none;
  }
</style>
