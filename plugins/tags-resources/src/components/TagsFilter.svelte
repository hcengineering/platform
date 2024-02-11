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
  import presentation, { getClient } from '@hcengineering/presentation'
  import { TagCategory, TagElement } from '@hcengineering/tags'
  import {
    Button,
    EditWithIcon,
    Icon,
    IconCheck,
    IconSearch,
    Label,
    Loading,
    deviceOptionsStore,
    getEventPopupPositionElement,
    getPlatformColorDef,
    resizeObserver,
    showPopup,
    themeStore
  } from '@hcengineering/ui'
  import { Filter } from '@hcengineering/view'
  import { FILTER_DEBOUNCE_MS, FilterQuery, sortFilterValues } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
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

  let filterUpdateTimeout: any | undefined

  let categories: TagCategory[] = []
  let objects: TagElement[] = []

  let catsSorted = false

  client.findAll(tags.class.TagCategory, { targetClass: _class }).then((res) => {
    categories = res
  })

  let objectsPromise: Promise<FindResult<TagElement>> | undefined
  let queryId = 0

  async function getValues (search: string): Promise<void> {
    const qid = ++queryId
    const resultQuery =
      search !== ''
        ? {
            title: { $like: search.replace('*', '%') + '%' },
            targetClass: _class
          }
        : { targetClass: _class }
    objectsPromise = client.findAll(tags.class.TagElement, resultQuery)
    const _objects = sortFilterValues(await objectsPromise, isSelected)
    if (qid !== queryId) {
      return
    }
    objects = _objects
    objectsPromise = undefined
  }

  $: if (!catsSorted && categories.length > 0 && objects.length > 0 && selected.length > 0) {
    categories.sort((a, b) => {
      const alen = objects.filter((el) => el.category === a._id && isSelected(el))
      const blen = objects.filter((el) => el.category === b._id && isSelected(el))
      return blen.length - alen.length
    })
    categories = categories
    catsSorted = true
  }

  let search: string = ''

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

  function handleFilterToggle (element: TagElement): void {
    if (isSelected(element)) {
      selected = selected.filter((p) => p !== element._id)
    } else {
      selected = [...selected, element._id]
    }
    objects = objects
    categories = categories

    updateFilter(selected, level)
  }

  function updateFilter (newValues: Ref<TagElement>[], newLevel: number) {
    clearTimeout(filterUpdateTimeout)

    filterUpdateTimeout = setTimeout(() => {
      filter.value = [...newValues]
      // Replace last one with value with level
      filter.props = { level: newLevel }
      onChange(filter)
    }, FILTER_DEBOUNCE_MS)
  }

  $: schema = filter.key.attribute.schema ?? '0'

  const dispatch = createEventDispatcher()
  getValues(search)

  $: tagLevelIcon = schema === '3' ? undefined : tagLevel[((level % 3) + 1) as 1 | 2 | 3]
  $: tagLevelLabel = [tags.string.Initial, tags.string.Meaningfull, tags.string.Expert][Math.floor(level / 3)]
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="header">
    <EditWithIcon
      icon={IconSearch}
      size={'large'}
      width={'100%'}
      autoFocus={!$deviceOptionsStore.isMobile}
      bind:value={search}
      placeholder={presentation.string.Search}
      on:input={() => getValues(search)}
    />
    {#if schema !== '0'}
      <div class="flex-between w-full mt-2">
        <span class="overflow-label pl-2 mr-2"><Label label={tags.string.Weight} /></span>
        <Button
          label={tagLevelLabel}
          icon={tagLevelIcon}
          on:click={(evt) => {
            showPopup(WeightPopup, { value: level, schema }, getEventPopupPositionElement(evt), (res) => {
              if (Number.isFinite(res) && res >= 0 && res <= 8) {
                if (res != null) {
                  level = res
                  updateFilter(selected, level)
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
        {#each categories as cat, i}
          {@const values = objects.filter((el) => el.category === cat._id)}
          {#if values.length > 0}
            {#if i > 0}<div class="menu-separator" />{/if}
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
                  {@const color = getPlatformColorDef(element.color, $themeStore.dark)}
                  <button
                    class="menu-item no-focus flex-row-center"
                    on:click={() => {
                      handleFilterToggle(element)
                    }}
                  >
                    <div class="tag" style:background-color={color.color} />
                    <span class="overflow-label label flex-grow">{element.title}</span>
                    <div class="check pointer-events-none">
                      {#if isSelected(element)}
                        <Icon icon={IconCheck} size={'small'} />
                      {/if}
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
  <div class="menu-space" />
</div>

<style>
  .hidden {
    display: none;
  }
</style>
