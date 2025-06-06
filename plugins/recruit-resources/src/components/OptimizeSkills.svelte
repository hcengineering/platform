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
  import { Class, Doc, platformNow, platformNowDiff, Ref, toIdMap } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { Card, getClient } from '@hcengineering/presentation'
  import tags, { TagCategory, TagElement, TagReference } from '@hcengineering/tags'
  import { Button, CheckBox, EditBox, Expandable, Lazy, ListView, Loading } from '@hcengineering/ui'
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
    void getClient()
      .findAll(tags.class.TagCategory, { targetClass })
      .then((result) => {
        categories = result
        loading1 = false
      })
  }

  $: {
    loading2 = true
    void getClient()
      .findAll(
        tags.class.TagElement,
        { category: { $in: Array.from(categories.map((it) => it._id)) } },
        { sort: { title: 1 } }
      )
      .then((res) => {
        res.sort((a, b) => prepareTitle(a.title).localeCompare(prepareTitle(b.title)))
        elements = res
        loading2 = false
      })
  }

  interface TagUpdatePlan {
    // Just updated or new elements
    elements: {
      original: TagElement
      element?: TagElement
      move: Ref<TagElement>[]
      toDelete: boolean
      total: number
      newRefs: number
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

  let expertRefs: Pick<TagReference, '_id' | '_class' | 'tag' | 'title'>[] = []

  let titles: string[] = []
  const titlesStates = new Map<string, boolean>()
  $: void getClient()
    .findAll(
      tags.class.TagReference,
      {
        tag: {
          $in: Array.from(elements.map((it) => it._id))
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
    .then((res) => {
      expertRefs = res
    })

  $: preparedRefs = expertRefs.map((it) => ({ ...it, title: prepareTitle(it.title) }))

  let counters = new Map<string, number>()
  $: {
    const _counters = new Map<string, number>()
    for (const t of titles) {
      const refs = preparedRefs.filter((it) => it.title.toLowerCase() === t).length
      _counters.set(t, refs)
      if (refs < 5) {
        titlesStates.set(t, false)
      }
    }
    counters = _counters
  }

  $: titles = Array.from(new Set(expertRefs.map((it) => prepareTitle(it.title.toLocaleLowerCase()))))

  // Will return a set of operations over tag elements
  async function updateTagsList (
    tagElements: TagElement[],
    expertRefs: Pick<TagReference, '_id' | '_class' | 'tag' | 'title'>[]
  ): Promise<void> {
    const _plan: TagUpdatePlan = {
      elements: [],
      move: 0
    }

    const tagMap = toIdMap(tagElements)

    const namedElements = new Map<string, Ref<TagElement>>()
    const goodTags: TagElement[] = []
    for (const tag of tagElements) {
      if (tag.category.includes(recruit.category.Category)) {
        namedElements.set(prepareTitle(tag.title.toLowerCase()), tag._id)
        goodTags.push(tag)
      }
    }

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
      .slice()
      .sort((a, b) => b.title.length - a.title.length)
      .filter((t) => t.title.length > 2)
    const goodSortedTagsTitles = new Map<Ref<TagElement>, string>()
    processed = -1

    // Candidate to have in list.
    const allRefs = await getClient().findAll(
      tags.class.TagReference,
      {},
      {
        projection: {
          tag: 1,
          _id: 1
        }
      }
    )

    const tagElementIds = new Map<Ref<TagElement>, TagUpdatePlan['elements'][0]>()

    for (const tag of tagElements.slice().sort((a, b) => prepareTitle(a.title).length - prepareTitle(b.title).length)) {
      processed++
      const refs = allRefs.filter((it) => it.tag === tag._id)
      if (goodTagMap.has(tag._id)) {
        const ee = {
          original: tag,
          move: [],
          toDelete: false,
          total: refs.length,
          newRefs: 0
        }
        _plan.elements.push(ee)
        tagElementIds.set(tag._id, ee)
        continue
      }
      let title = prepareTitle(tag.title)
      if (title.length === 1) {
        _plan.elements.push({
          original: tag,
          move: [],
          toDelete: true,
          total: refs.length,
          newRefs: 0
        })
        continue
      }
      const namedIdx = namedElements.get(prepareTitle(title.toLowerCase()))
      if (namedIdx !== undefined || title.length === 0) {
        _plan.elements.push({
          original: tag,
          move: namedIdx !== undefined ? [namedIdx] : [],
          toDelete: true,
          total: refs.length,
          newRefs: 0
        })
        if (namedIdx !== undefined) {
          const re = tagElementIds.get(namedIdx)
          if (re !== undefined) {
            re.newRefs += refs.length
          }
        }
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
        if (lowTitle.includes(tt)) {
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
          toDelete: false,
          newRefs: 0,
          total: refs.length
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

          const re = tagElementIds.get(t._id)
          if (re !== undefined) {
            re.newRefs += mve.total
          }
        }
        const namedIdx = namedElements.get(prepareTitle(title).toLowerCase())
        if (namedIdx !== undefined) {
          title = ''
          mve.move.push(namedIdx)
        }
        mve.element = { ...tag, title: prepareTitle(title) }
        mve.toDelete = prepareTitle(title).length <= 1 || isForRemove(title)

        mve.total = refs.length
        if (isForRemove(title)) {
          mve.element.title = ''
        } else {
          // Candidate to have in list.
          if (refs.length < 2) {
            mve.toDelete = true
          }
        }
        if (!mve.toDelete) {
          namedElements.set(prepareTitle(mve.element.title.toLowerCase()), tag._id)
          goodSortedTags.push(mve.element)
          goodSortedTags.sort((a, b) => b.title.length - a.title.length).filter((t) => t.title.length > 2)
          goodSortedTagsTitles.delete(mve.element._id)
        }

        _plan.elements.push(mve)
        tagElementIds.set(tag._id, mve)
        _plan.move++
        continue
      }

      // Candidate to have in list.
      if (isForRemove(title) || refs.length < 2) {
        _plan.elements.push({
          original: tag,
          move: [],
          toDelete: true,
          newRefs: 0,
          total: refs.length
        })
        _plan.move++
        continue
      }
      namedElements.set(prepareTitle(title.toLowerCase()), tag._id)
      const ee: TagUpdatePlan['elements'][0] = {
        original: tag,
        element: { ...tag, title },
        move: [],
        toDelete: false,
        total: refs.length,
        newRefs: 0
      }

      _plan.elements.push(ee)
      if (ee.element !== undefined && ee.element.title.length > 2) {
        goodSortedTags.push(ee.element)
        goodSortedTagsTitles.delete(ee.element._id)
        goodSortedTags.sort((a, b) => b.title.length - a.title.length).filter((t) => t.title.length > 2)
      }
      if (ee.element !== undefined) {
        goodTags.push(ee.element)
      }
    }
    _plan.elements.sort((a, b) => prepareTitle(a.original.title).localeCompare(prepareTitle(b.original.title)))
    plan = _plan
    processed = 0
  }

  let doProcessing = false

  function doAnalyse (): void {
    doProcessing = true
    if (elements.length > 0 && expertRefs.length > 0) {
      setTimeout(() => {
        void updateTagsList(
          elements,
          expertRefs.filter((it) => titlesStates.get(prepareTitle(it.title.toLowerCase())) ?? true)
        ).then(() => {
          doProcessing = false
        })
      }, 10)
    }
  }
  let search: string = ''

  let _search: string = ''

  $: setTimeout(() => {
    _search = search
  }, FILTER_DEBOUNCE_MS)

  $: searchPlanElements = plan.elements.filter((it) => it.original.title.toLowerCase().includes(_search.toLowerCase()))

  $: idMap = new Map(plan.elements.filter((it) => !it.toDelete).map((it) => [it.original._id, it]))

  $: searchTitles = titles.filter((it) => it.toLowerCase().includes(_search.toLowerCase()))

  let processed: number = 0

  async function applyPlan (): Promise<void> {
    processed = 0
    const updateClasses = new Set<Ref<Class<Doc>>>()
    const client = getClient()
    for (const item of searchPlanElements) {
      console.log('Apply', item.original.title)
      const st = platformNow()
      const ops = client.apply(undefined, 'optimize-skill')
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
            const me = idMap.get(m)
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
      console.log('Apply:commit', item.original.title, platformNowDiff(st))
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

  function exportCSV (name: string, data: string): void {
    const filename = name + new Date().toLocaleDateString() + '.csv'
    const link = document.createElement('a')
    link.style.display = 'none'
    link.setAttribute('target', '_blank')
    link.setAttribute('href', 'data:text/csv;charset=utf-8,%EF%BB%BF' + encodeURIComponent(data))
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function exportExpertSkills (): string {
    // Construct csv
    const csv: string[] = []
    csv.push('title;enabled;references')
    for (const t of titles) {
      const row: string[] = []
      row.push('"' + t + '"')
      row.push('"' + (titlesStates.get(t) ?? true) ? 'true' : 'false' + '"')
      row.push('"' + (counters.get(t) ?? 0) + '"')
      csv.push(row.join(';'))
    }
    return csv.join('\n')
  }

  function exportPlan (): string {
    // Construct csv
    const csv: string[] = []
    csv.push('number; title;total; new refs; new title;to delete;will add tags ')
    let i = 0
    for (const t of plan.elements) {
      const row: string[] = []
      row.push('"' + i++ + '"')
      row.push('"' + (t.original?.title ?? '') + '"')
      row.push('"' + (t.total + t.newRefs) + '"')
      row.push('"' + t.newRefs + '"')
      row.push('"' + (t.element?.title ?? '') + '"')
      row.push('"' + (t.toDelete ? 'yes' : '') + '"')
      const moveTo = t.move.map((it) => {
        const orig = idMap.get(it)
        return (
          orig?.original.title + (' (#' + plan.elements.findIndex((it) => it.original._id === orig?.original._id) + ')')
        )
      })
      row.push('"' + moveTo.join(', ') + '"')
      csv.push(row.join(';'))
    }
    return csv.join('\n')
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
    {#if processed > 0 || doProcessing}
      <div class="p-1">
        <Loading />
        Processing: {processed} / {searchPlanElements.length}
      </div>
    {/if}
    {#if (loading1 || loading2) && !doProcessing}
      <Loading />
    {/if}
  </div>
  <Expandable>
    <svelte:fragment slot="title">
      Existing Expert level skills
      {titles.length} =>
      {titles.filter((it) => titlesStates.get(it) ?? true).length}
    </svelte:fragment>
    <div class="h-60" style:overflow={'auto'}>
      <ListView count={searchTitles.length}>
        <svelte:fragment slot="item" let:item>
          {@const el = searchTitles[item]}
          <div class="flex-row-center flex-nowrap no-word-wrap">
            <CheckBox
              checked={titlesStates.get(el) ?? true}
              on:value={(val) => {
                titlesStates.set(el, val.detail === true)
              }}
            />
            {el}
            {counters.get(el)}
          </div>
        </svelte:fragment>
      </ListView>
    </div>
  </Expandable>
  <Expandable>
    <svelte:fragment slot="title">
      <div class="flex-row-center">
        Update plan {elements.length}

        {#if plan.elements.length - plan.move > 0}
          => {plan.elements.length - plan.move}
        {/if}
      </div>
    </svelte:fragment>
    <div class="h-60" style:overflow={'auto'}>
      {#if plan.elements.length > 0}
        <div class="flex clear-mins" style:overflow={'auto'}>
          <div class="flex-grow flex-nowrap no-word-wrap">
            <ListView count={searchPlanElements.length}>
              <svelte:fragment slot="item" let:item>
                {@const el = searchPlanElements[item]}
                <div class="flex-row-center" style:color={toColor(el)}>
                  <Lazy>
                    {el.original.title}
                    {#if el.element}
                      => {el.element?.title}
                    {/if}
                    {#each el.move as mid}
                      {@const orig = idMap.get(mid)}
                      {#if orig !== undefined}
                        ➡︎ {orig?.element?.title ?? orig?.original.title}
                      {:else}
                        {mid}
                      {/if}
                    {/each}
                    ({el.total + el.newRefs}) {el.newRefs}
                  </Lazy>
                </div>
              </svelte:fragment>
            </ListView>
          </div>
        </div>
      {/if}
    </div>
  </Expandable>
  <svelte:fragment slot="footer">
    <Button
      label={getEmbeddedLabel('Analyse')}
      on:click={() => {
        doAnalyse()
      }}
    />
    <Button
      label={getEmbeddedLabel('Export expert skills')}
      on:click={() => {
        exportCSV('experts', exportExpertSkills())
      }}
    />
    <Button
      label={getEmbeddedLabel('Export plan')}
      on:click={() => {
        exportCSV('plan', exportPlan())
      }}
    />
  </svelte:fragment>
</Card>

<style lang="scss">
  .color {
    width: 1rem;
    height: 1rem;
    border-radius: 0.25rem;
  }
</style>
