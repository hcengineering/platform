<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Class, Doc, Ref, toIdMap } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { Card, getClient } from '@hcengineering/presentation'
  import tags, { TagCategory, TagElement, TagReference } from '@hcengineering/tags'
  import { EditBox, ListView, Loading } from '@hcengineering/ui'
  import { FILTER_DEBOUNCE_MS } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import recruit from '../plugin'

  export let targetClass: Ref<Class<Doc>>

  export function canClose (): boolean {
    return true
  }

  const dispatch = createEventDispatcher()

  // const query = createQuery()
  // const elementsQuery = createQuery()
  // const refsQuery = createQuery()

  let categories: TagCategory[] = []
  let elements: TagElement[] = []
  // let refs: TagReference[] = []

  let loading1: boolean = false
  let loading2: boolean = false
  $: {
    loading1 = true
    getClient()
      .findAll(tags.class.TagCategory, { targetClass })
      .then((result) => {
        categories = result
        loading1 = false
      })
  }

  $: {
    loading2 = true
    getClient()
      .findAll(
        tags.class.TagElement,
        { category: { $in: Array.from(categories.map((it) => it._id)) } },
        { sort: { title: 1 } }
      )
      .then((res) => {
        elements = res.toSorted((a, b) => prepareTitle(a.title).localeCompare(prepareTitle(b.title)))
        loading2 = false
      })
  }

  // $: refsQuery.query(tags.class.TagReference, { tag: { $in: Array.from(elements.map((it) => it._id)) } }, (res) => {
  //   refs = res
  // })
  const selection = 0
  $: selEl = elements[selection]

  interface TagUpdatePlan {
    // Just updated or new elements
    elements: {
      original: TagElement
      element?: TagElement
      move: Ref<TagElement>[]
      toDelete: boolean
      total?: number
    }[]
    move: number
  }

  function prepareTitle (title: string): string {
    // Replace all non letter or digit characters with spaces
    let result = ''
    let last = ''
    for (const c of title) {
      if (c === '-') {
        continue
      }
      if (isLetterOrDigit(c) || (result.length > 0 && (c === '+' || c === '#'))) {
        if (c !== '+' && last === '+') {
          // Remove + in the middle
          result = result.substring(0, result.length - 1)
        }
        if (c !== '#' && last === '#') {
          // Remove # in the middle
          result = result.substring(0, result.length - 1)
        }
        result += c
        last = c
      } else {
        if (last !== ' ') {
          result += ' '
          last = ' '
        }
      }
    }
    return result.trim()
  }

  function isLetter (c?: string): boolean {
    if (c == null) {
      return false
    }
    return c.toLowerCase() !== c.toUpperCase()
  }

  function isDigit (c?: string): boolean {
    return (
      c === '0' ||
      c === '1' ||
      c === '2' ||
      c === '3' ||
      c === '4' ||
      c === '5' ||
      c === '6' ||
      c === '7' ||
      c === '8' ||
      c === '9'
    )
  }

  function isLetterOrDigit (c?: string): boolean {
    if (c == null) {
      return false
    }
    if (isDigit(c)) {
      return true
    }
    return c.toLowerCase() !== c.toUpperCase()
  }

  function isForRemove (cc: string): boolean {
    for (const c of cc) {
      if (isLetter(c)) {
        return false
      }
    }
    // Only digits and non letters
    return true
  }

  let plan: TagUpdatePlan = {
    elements: [],
    move: 0
  }
  // Will return a set of operations over tag elements
  async function updateTagsList (tagElements: TagElement[]): Promise<void> {
    const _plan: TagUpdatePlan = {
      elements: [],
      move: 0
    }

    const tagMap = toIdMap(tagElements)

    const namedElements = new Map<string, Ref<TagElement>>()
    const goodTags: TagElement[] = []
    for (const tag of tagElements) {
      if (tag.category.indexOf(recruit.category.Category) >= 0) {
        namedElements.set(prepareTitle(tag.title.toLowerCase()), tag._id)
        goodTags.push(tag)
      }
    }

    const expertRefs = await getClient().findAll(
      tags.class.TagReference,
      {
        tag: {
          $in: Array.from(tagElements.map((it) => it._id))
        },
        weight: { $gt: 5 } // We need expert ones.
      },
      {
        projection: {
          tag: 1,
          _id: 1,
          title: 1
        }
      }
    )

    const toGoodTags = Array.from(new Set(expertRefs.map((it) => it.tag)))
      .map((it) => tagMap.get(it))
      .filter((it) => it) as TagElement[]
    let goodTagMap = toIdMap(goodTags)

    for (const tag of toGoodTags) {
      const tt = prepareTitle(tag.title.toLowerCase())
      if (!goodTagMap.has(tag._id) && !namedElements.has(tt)) {
        namedElements.set(tt, tag._id)
        goodTags.push(tag)
      }
    }
    goodTagMap = toIdMap(goodTags)

    const goodSortedTags = goodTags
      .toSorted((a, b) => b.title.length - a.title.length)
      .filter((t) => t.title.length > 2)
    const goodSortedTagsTitles = new Map<Ref<TagElement>, string>()
    processed = -1
    for (const tag of tagElements.toSorted((a, b) => prepareTitle(a.title).length - prepareTitle(b.title).length)) {
      processed++
      if (goodTagMap.has(tag._id)) {
        _plan.elements.push({
          original: tag,
          move: [],
          toDelete: false,
          total: -1
        })
        continue
      }
      let title = prepareTitle(tag.title)
      if (title.length === 1) {
        _plan.elements.push({
          original: tag,
          move: [],
          toDelete: true
        })
        continue
      }
      const namedIdx = namedElements.get(prepareTitle(title.toLowerCase()))
      if (namedIdx !== undefined || title.length === 0) {
        _plan.elements.push({
          original: tag,
          move: namedIdx !== undefined ? [namedIdx] : [],
          toDelete: true
        })
        _plan.move++
        continue
      }

      // Search for included tags
      const toReplace = goodSortedTags.filter((t) => {
        const lowTitle = title.toLowerCase()
        let tt = goodSortedTagsTitles.get(t._id)
        if (tt === undefined) {
          tt = prepareTitle(t.title.toLowerCase())
          goodSortedTagsTitles.set(t._id, tt)
        }
        if (lowTitle.indexOf(tt) !== -1) {
          // We need to be sure we have some non word character at the end of match
          let spos = 0
          while (true) {
            const pos = title.toLowerCase().indexOf(tt, spos)
            if (pos === -1) {
              return false
            }
            if (!isLetter(title[pos - 1]) && !isLetter(title[pos + tt.length])) {
              // Begin and end
              return true
            }
            spos = pos + 1
          }
        }
        return false
      })
      if (toReplace.length > 0) {
        const mve: TagUpdatePlan['elements'][0] = {
          original: tag,
          move: [],
          toDelete: false
        }
        for (const t of toReplace) {
          let tt = goodSortedTagsTitles.get(t._id)
          if (tt === undefined) {
            tt = prepareTitle(t.title.toLowerCase())
            goodSortedTagsTitles.set(t._id, tt)
          }

          let p = 0
          while (true) {
            const pos = title.toLowerCase().indexOf(tt.toLowerCase())
            if (pos === -1) {
              break
            }
            p++
            title = prepareTitle((title.substring(0, pos) + ' ' + title.substring(pos + tt.length)).replace('  ', ' '))
          }
          if (p === 0) {
            continue
          }
          mve.move.push(t._id)
        }
        const namedIdx = namedElements.get(prepareTitle(title).toLowerCase())
        if (namedIdx !== undefined) {
          title = ''
          mve.move.push(namedIdx)
        }
        mve.element = { ...tag, title: prepareTitle(title) }
        mve.toDelete = prepareTitle(title).length <= 1 || isForRemove(title)

        if (isForRemove(title)) {
          mve.element.title = ''
        } else {
          // Candidate to have in list.
          const refs = await getClient().findAll(tags.class.TagReference, { tag: tag._id }, { limit: 2, total: true })
          if (refs.length < 2) {
            mve.toDelete = true
            mve.total = refs.total
          }
        }
        if (!mve.toDelete) {
          namedElements.set(prepareTitle(mve.element.title.toLowerCase()), tag._id)
          goodSortedTags.push(mve.element)
          goodSortedTags.sort((a, b) => b.title.length - a.title.length).filter((t) => t.title.length > 2)
          goodSortedTagsTitles.delete(mve.element._id)
        }

        _plan.elements.push(mve)
        _plan.move++
        continue
      }

      // Candidate to have in list.
      const refs = await getClient().findAll(tags.class.TagReference, { tag: tag._id }, { limit: 2, total: true })
      if (isForRemove(title) || refs.length < 2) {
        _plan.elements.push({
          original: tag,
          move: [],
          toDelete: true
        })
        _plan.move++
        continue
      }
      namedElements.set(prepareTitle(title.toLowerCase()), tag._id)
      const ee = {
        original: tag,
        element: { ...tag, title },
        move: [],
        toDelete: false,
        total: refs.total
      }

      _plan.elements.push(ee)
      if (ee.element?.title.length > 2) {
        goodSortedTags.push(ee.element)
        goodSortedTagsTitles.delete(ee.element._id)
        goodSortedTags.sort((a, b) => b.title.length - a.title.length).filter((t) => t.title.length > 2)
      }
      goodTags.push(ee.element)
    }
    _plan.elements.sort((a, b) => prepareTitle(a.original.title).localeCompare(prepareTitle(b.original.title)))
    plan = _plan
    processed = 0
  }

  let doProcessing = false
  $: {
    doProcessing = true
    updateTagsList(elements).then(() => {
      doProcessing = false
    })
  }
  let search: string = ''

  let _search: string = ''

  $: setTimeout(() => {
    _search = search
  }, FILTER_DEBOUNCE_MS)

  $: searchPlanElements = plan.elements.filter(
    (it) => it.original.title.toLowerCase().indexOf(_search.toLowerCase()) !== -1
  )

  let processed: number = 0

  async function applyPlan (): Promise<void> {
    processed = 0
    const updateClasses = new Set<Ref<Class<Doc>>>()
    const client = getClient()
    for (const item of searchPlanElements) {
      console.log('Apply', item.original.title)
      const st = Date.now()
      const ops = client.apply('optimize:' + item.original._id)
      let allRefs: TagReference[] = await client.findAll(tags.class.TagReference, { tag: item.original._id })

      allRefs.sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))

      const uniqRefs = new Set()
      const uniqTags = new Set()
      for (const d of allRefs) {
        if (!uniqTags.has(d.tag + d.attachedTo)) {
          uniqTags.add(d.tag + d.attachedTo)
          uniqRefs.add(d._id)
        } else {
          await ops.remove(d)
        }
      }

      allRefs = allRefs.filter((it) => uniqRefs.has(it._id))

      if (item.move.length > 0) {
        // We need to find all objects and add new tag elements to them and preserve skill level
        for (const a of allRefs) {
          for (const m of item.move) {
            const me = plan.elements.find((it) => it.original._id === m && it.toDelete === false)
            if (me !== undefined) {
              const id = await ops.addCollection(
                tags.class.TagReference,
                a.space,
                a.attachedTo,
                a.attachedToClass,
                a.collection,
                {
                  tag: m,
                  color: me.original.color,
                  title: me.element?.title ?? me.original.title,
                  weight: a.weight
                }
              )
              uniqRefs.add(id)
            }
          }
        }
      }
      // We could delete original and it's all refs
      if (item.toDelete) {
        updateClasses.add(item.original._class)
        await ops.remove(item.original)
        for (const a of allRefs) {
          updateClasses.add(a._class)
          await ops.remove(a)
        }
      } else {
        if (item.element !== undefined) {
          updateClasses.add(item.original._class)
          for (const a of allRefs) {
            if (prepareTitle(a.title.toLowerCase()) === prepareTitle(item.element.title.toLowerCase())) {
              updateClasses.add(a._class)
              await ops.diffUpdate(a, {
                title: item.element.title,
                color: item.element.color
              })
            } else {
              updateClasses.add(a._class)
              // Let's remove and add new tag reference
              await ops.remove(a)
              updateClasses.add(tags.class.TagReference)
              await ops.addCollection(tags.class.TagReference, a.space, a.attachedTo, a.attachedToClass, a.collection, {
                tag: item.element._id,
                color: item.element.color,
                title: item.element.title,
                weight: a.weight
              })
            }
          }
          await ops.diffUpdate(item.original, {
            ...item.element,
            refCount: uniqRefs.size
          })
        }
      }
      console.log('Apply:commit', item.original.title, Date.now() - st)
      await ops.commit(false)
      processed++
    }
    const ops = client.apply('optimize:done')
    await ops.commit(true, Array.from(updateClasses))
    console.log('Apply:done')
    processed = 0
  }
  function toColor (el: TagUpdatePlan['elements'][0]): string | undefined {
    if (el.total === -1) {
      return 'blue'
    }
    if (el.toDelete && el.move.length === 0) {
      return 'red'
    }

    if (el.move.length > 0) {
      return 'purple'
    }
    return undefined
  }
</script>

<Card
  label={getEmbeddedLabel('Skills optimizer')}
  okAction={applyPlan}
  okLabel={getEmbeddedLabel('Apply')}
  canSave={true}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <div class="flex-row-center">
    <EditBox kind={'search-style'} bind:value={search} />

    {#if processed > 0}
      <div class="p-1">
        <Loading />
        Processing: {processed} / {searchPlanElements.length}
      </div>
    {/if}
    {#if (loading1 || loading2) && !doProcessing}
      <Loading />
    {/if}
  </div>
  <div class="flex clear-mins" style:overflow={'auto'}>
    <div class="flex-grow flex-nowrap no-word-wrap">
      <div class="flex-row-center">
        {elements.length} => {plan.elements.length - plan.move}
      </div>
      <ListView count={searchPlanElements.length}>
        <svelte:fragment slot="item" let:item>
          {@const el = searchPlanElements[item]}
          <div class="flex-row-center" style:color={toColor(el)}>
            {el.original.title}
            {#if el.element}
              => {el.element?.title}
            {/if}
            {#each el.move as mid}
              {@const orig = plan.elements.find((it) => it.original._id === mid)}
              {#if orig !== undefined}
                ➡︎ {orig?.element?.title ?? orig?.original.title}
              {:else}
                {mid}
              {/if}
            {/each}
            {#if (el.total ?? 0) > 0}
              ({el.total})
            {/if}
          </div>
        </svelte:fragment>
      </ListView>
    </div>
  </div>
</Card>

<style lang="scss">
  .color {
    width: 1rem;
    height: 1rem;
    border-radius: 0.25rem;
  }
</style>
