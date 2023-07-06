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
  import { Class, Doc, DocumentQuery, FindOptions, Ref } from '@hcengineering/core'
  import { Asset, IntlString, translate } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { TagCategory, TagElement } from '@hcengineering/tags'
  import { AnySvelteComponent, Button, Label, SearchEdit, showPopup, IconAdd, themeStore } from '@hcengineering/ui'
  import { TableBrowser } from '@hcengineering/view-resources'
  import tags from '../plugin'
  import CategoryBar from './CategoryBar.svelte'
  import CreateTagElement from './CreateTagElement.svelte'
  // import { deviceOptionsStore as deviceInfo } from '@hcengineering/ui'

  export let title: IntlString = tags.string.Tags
  export let icon: Asset | AnySvelteComponent = tags.icon.Tags
  export let item: IntlString = tags.string.Tag
  export let сreateItemLabel: IntlString = tags.string.TagCreateLabel
  export let targetClass: Ref<Class<Doc>>
  export let onTag: ((tag: TagElement) => void) | undefined = undefined

  let keyTitle: string
  $: translate(item, {}, $themeStore.language).then((t) => {
    keyTitle = t.toLowerCase()
  })

  let search = ''
  let resultQuery: DocumentQuery<TagElement> = { targetClass }

  function updateResultQuery (search: string, category?: Ref<TagCategory>): void {
    resultQuery = search === '' ? { targetClass } : { $search: search, targetClass }
    if (category !== undefined) {
      resultQuery.category = category
    }
  }

  function showCreateDialog () {
    showPopup(CreateTagElement, { targetClass, keyTitle }, 'top')
  }
  const opt: FindOptions<TagElement> = {
    lookup: {
      category: tags.class.TagCategory
    }
  }
  let category: Ref<TagCategory> | undefined = undefined

  type TagElementInfo = { count: number; modifiedOn: number }
  let tagElements: Map<Ref<TagElement>, TagElementInfo> | undefined
  const refQuery = createQuery()
  $: refQuery.query(
    tags.class.TagReference,
    {},
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
  const countSorting = (a: Doc, b: Doc) =>
    (tagElements?.get(b._id as Ref<TagElement>)?.count ?? 0) -
      (tagElements?.get(a._id as Ref<TagElement>)?.count ?? 0) ?? 0

  // $: twoRows = $deviceInfo.twoRows
</script>

<div class="ac-header full divide">
  <div class="ac-header__wrap-title mr-3">
    <span class="ac-header__title"><Label label={title} /></span>
  </div>

  <div class="clear-mins mb-1">
    <Button icon={IconAdd} label={сreateItemLabel} kind={'accented'} on:click={showCreateDialog} />
  </div>
</div>
<div class="ac-header full divide search-start">
  <div class="ac-header-full small-gap">
    <SearchEdit bind:value={search} on:change={() => updateResultQuery(search, category)} />
    <!-- <ActionIcon icon={IconMoreH} size={'small'} /> -->
  </div>
</div>

<CategoryBar
  {targetClass}
  {category}
  on:change={(evt) => {
    category = evt.detail.category ?? undefined
    updateResultQuery(search, category)
  }}
/>
<TableBrowser
  _class={tags.class.TagElement}
  config={[
    {
      key: '',
      label: item,
      presenter: tags.component.TagElementPresenter,
      props: { edit: true, keyTitle },
      sortingKey: 'title'
    },
    {
      key: '$lookup.category',
      presenter: tags.component.CategoryPresenter,
      sortingKey: 'category',
      label: tags.string.CategoryLabel
    },
    {
      key: '',
      presenter: tags.component.TagElementCountPresenter,
      label: item,
      props: { tagElements, label: item, icon, onTag },
      sortingKey: '@tagCount',
      sortingFunction: countSorting
    },
    'description',
    'modifiedOn'
  ]}
  options={opt}
  query={resultQuery}
  showNotification
/>
