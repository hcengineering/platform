<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import contact from '@anticrm/contact'
  import { Doc, DocumentQuery, Ref } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import tags, { selectedTagElements, TagCategory, TagElement } from '@anticrm/tags'
  import { ActionIcon, showPopup, Component, Icon, Label, Loading, SearchEdit } from '@anticrm/ui'
  import view, { Viewlet, ViewletPreference } from '@anticrm/view'
  import { ActionContext, TableBrowser, ViewletSetting } from '@anticrm/view-resources'
  import recruit from '../plugin'

  let search = ''
  let resultQuery: DocumentQuery<Doc> = {}

  const client = getClient()

  let descr: Viewlet | undefined
  let loading = true

  const preferenceQuery = createQuery()
  let preference: ViewletPreference | undefined

  client
    .findOne<Viewlet>(view.class.Viewlet, {
      attachTo: recruit.mixin.Candidate,
      descriptor: view.viewlet.Table
    })
    .then((res) => {
      descr = res
      if (res !== undefined) {
        preferenceQuery.query(
          view.class.ViewletPreference,
          {
            attachedTo: res._id
          },
          (res) => {
            preference = res[0]
            loading = false
          },
          { limit: 1 }
        )
      }
    })

  let category: Ref<TagCategory> | undefined = undefined

  let documentIds: Ref<Doc>[] = []
  async function updateResultQuery (search: string, documentIds: Ref<Doc>[]): Promise<void> {
    resultQuery = search === '' ? {} : { $search: search }
    if (documentIds.length > 0) {
      resultQuery._id = { $in: documentIds }
    }
  }

  // Find all tags for object classe with matched elements
  const query = createQuery()

  $: query.query(tags.class.TagReference, { tag: { $in: $selectedTagElements } }, (result) => {
    documentIds = Array.from(new Set<Ref<Doc>>(result.map((it) => it.attachedTo)).values())
  })

  $: updateResultQuery(search, documentIds)

  function updateCategory (detail: { category: Ref<TagCategory> | null; elements: TagElement[] }) {
    category = detail.category ?? undefined
    selectedTagElements.set(Array.from(detail.elements ?? []).map((it) => it._id))
  }
</script>

<div class="ac-header full">
  <div class="ac-header__wrap-title">
    <div class="ac-header__icon"><Icon icon={contact.icon.Person} size={'small'} /></div>
    <span class="ac-header__title"><Label label={recruit.string.Candidates} /></span>
  </div>

  <SearchEdit
    bind:value={search}
    on:change={() => {
      updateResultQuery(search, documentIds)
    }}
  />
  {#if descr}
    <ActionIcon
      icon={view.icon.Setting}
      size={'small'}
      label={view.string.CustomizeView}
      action={() => {
        showPopup(ViewletSetting, { viewlet: descr })
      }}
    />
  {/if}
</div>

<Component
  is={tags.component.TagsCategoryBar}
  props={{ targetClass: recruit.mixin.Candidate, category, selected: $selectedTagElements, mode: 'item' }}
  on:change={(evt) => updateCategory(evt.detail)}
/>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>
{#if descr}
  {#if loading}
    <Loading />
  {:else}
    <TableBrowser
      _class={recruit.mixin.Candidate}
      config={preference?.config ?? descr.config}
      options={descr.options}
      query={resultQuery}
      showNotification
    />
  {/if}
{/if}
