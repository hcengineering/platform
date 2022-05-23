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
<script context="module" lang="ts">
  const liveQueries: Map<number, LiveQuery> = new Map<number, LiveQuery>()
  const results: Map<number, Ref<Doc>[]> = new Map<number, Ref<Doc>[]>()
</script>

<script lang="ts">
  import { Class, Doc, FindResult, Ref } from '@anticrm/core'
  import { translate } from '@anticrm/platform'
  import presentation, { createQuery, getClient, LiveQuery } from '@anticrm/presentation'
  import { Button, CheckBox, getPlatformColor, Loading } from '@anticrm/ui'
  import { Filter } from '@anticrm/view'
  import view from '@anticrm/view-resources/src/plugin'
  import { createEventDispatcher, onMount } from 'svelte'
  import tags from '../plugin'
  import { TagCategory, TagElement } from '@anticrm/tags'

  export let _class: Ref<Class<Doc>>
  export let filter: Filter
  export let onChange: (e: Filter) => void
  filter.onRemove = () => {
    const lq = liveQueries.get(filter.index)
    lq?.unsubscribe()
    liveQueries.delete(filter.index)
    results.delete(filter.index)
  }
  const lq = getLiveQuery(filter.index)
  const client = getClient()
  let selected: Ref<TagElement>[] = filter.value

  function getLiveQuery (index: number): LiveQuery {
    let lq = liveQueries.get(index)
    if (lq === undefined) {
      lq = createQuery(true)
      liveQueries.set(index, lq)
    }
    return lq
  }

  async function getRefs (res: Ref<TagElement>[], onUpdate: () => void): Promise<Ref<Doc>[]> {
    const promise = new Promise<Ref<Doc>[]>((resolve, reject) => {
      const refresh = lq.query(
        tags.class.TagReference,
        {
          tag: { $in: res }
        },
        (refs) => {
          const result = Array.from(new Set(refs.map((p) => p.attachedTo)))
          results.set(filter.index, result)
          resolve(result)
          onUpdate()
        }
      )

      if (!refresh) {
        resolve(results.get(filter.index) ?? [])
      }
    })
    return promise
  }

  filter.modes = [
    {
      label: view.string.FilterIs,
      isAvailable: (res: any[]) => res.length <= 1,
      result: async (res: any[], onUpdate: () => void) => {
        const result = await getRefs(res, onUpdate)
        return { $in: result }
      }
    },
    {
      label: view.string.FilterIsEither,
      isAvailable: (res: any[]) => res.length > 1,
      result: async (res: any[], onUpdate: () => void) => {
        const result = await getRefs(res, onUpdate)
        return { $in: result }
      }
    },
    {
      label: view.string.FilterIsNot,
      isAvailable: () => true,
      result: async (res: any[], onUpdate: () => void) => {
        const result = await getRefs(res, onUpdate)
        return { $nin: result }
      }
    }
  ]

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

  function checkMode () {
    if (filter.mode?.isAvailable(filter.value)) return
    const newMode = filter.modes.find((p: any) => p.isAvailable(filter.value))
    filter.mode = newMode !== undefined ? newMode : filter.mode
  }

  let search: string = ''
  let phTraslate: string = ''
  let searchInput: HTMLInputElement
  $: translate(presentation.string.Search, {}).then((res) => {
    phTraslate = res
  })

  onMount(() => {
    if (searchInput) searchInput.focus()
  })

  const toggleGroup = (ev: MouseEvent): void => {
    const el: HTMLElement = ev.currentTarget as HTMLElement
    el.classList.toggle('show')
  }
  const show: boolean = false

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

  const dispatch = createEventDispatcher()
  getValues(search)
</script>

<div class="selectPopup">
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
  </div>
  <div class="scroll">
    <div class="box">
      {#if objectsPromise}
        <Loading />
      {:else}
        {#each categories as cat}
          {#if objects.filter((el) => el.category === cat._id).length > 0}
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
                  <span class="content-color mr-1">({objects.filter((el) => el.category === cat._id).length})</span>
                  <span class="counter">{getCount(cat)}</span>
                </div>
              </button>
              <div class="menu-group">
                {#each objects.filter((el) => el.category === cat._id) as element}
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
                      <div class="content-trans-color ml-2">
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
      filter.value = selected
      checkMode()
      onChange(filter)
      dispatch('close')
    }}
  />
</div>
