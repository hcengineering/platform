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
  import { Class, Doc, DocumentQuery, FindOptions, Ref } from '@anticrm/core'
  import { IntlString, translate } from '@anticrm/platform'
  import { TagCategory, TagElement } from '@anticrm/tags'
  import { Button, Icon, Label, ScrollBox, SearchEdit, showPopup } from '@anticrm/ui'
  import { Table } from '@anticrm/view-resources'
  import tags from '../plugin'
  import CategoryBar from './CategoryBar.svelte'
  import CreateTagElement from './CreateTagElement.svelte'

  export let title: IntlString = tags.string.Tags
  export let item: IntlString = tags.string.Tag
  export let targetClass: Ref<Class<Doc>>

  let keyTitle: string
  $: translate(item, {}).then((t) => {
    keyTitle = t
  })

  let search = ''
  let resultQuery: DocumentQuery<TagElement> = { targetClass }

  function updateResultQuery (search: string, category?: Ref<TagCategory>): void {
    resultQuery = search === '' ? { targetClass } : { $search: search, targetClass }
    if (category !== undefined) {
      resultQuery.category = category
    }
  }

  function showCreateDialog (ev: Event) {
    showPopup(CreateTagElement, { targetClass, keyTitle }, ev.target as HTMLElement)
  }
  const opt: FindOptions<TagElement> = {
    lookup: {
      category: tags.class.TagCategory
    }
  }
  let category: Ref<TagCategory> | undefined = undefined
</script>

<div class="ac-header full">
  <div class="ac-header__wrap-title">
    <div class="ac-header__icon"><Icon icon={tags.icon.Tags} size={'small'} /></div>
    <span class="ac-header__title"><Label label={title} /></span>
  </div>

  <SearchEdit
    bind:value={search}
    on:change={() => {
      updateResultQuery(search, category)
    }}
  />
  <Button label={tags.string.CreateItemLabel} primary={true} size={'small'} on:click={(ev) => showCreateDialog(ev)} />
</div>

<CategoryBar
  {targetClass}
  {category}
  on:change={(evt) => {
    category = evt.detail.category ?? undefined
    updateResultQuery(search, category)
  }}
/>
<ScrollBox vertical stretch noShift>
  <Table
    _class={tags.class.TagElement}
    config={[
      {
        key: '',
        label: item,
        presenter: tags.component.TagElementPresenter,
        props: { edit: true, keyTitle },
        sortingKey: 'title'
      },
      ...(category === undefined
        ? [
            {
              key: '$lookup.category',
              presenter: tags.component.CategoryPresenter,
              sortingKey: '$lookup.category',
              label: tags.string.CategoryLabel
            }
          ]
        : []),
      'description',
      'modifiedOn'
    ]}
    options={opt}
    query={resultQuery}
    enableChecking
  />
</ScrollBox>
<div class="ac-body__space-3" />
