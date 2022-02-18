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
  import { Button, Component, Icon, Label, ScrollBox, SearchEdit, showPopup } from '@anticrm/ui'
  import view, { Viewlet } from '@anticrm/view'
  import { Table } from '@anticrm/view-resources'
  import recruit from '../plugin'
  import CreateCandidate from './CreateCandidate.svelte'

  let search = ''
  let resultQuery: DocumentQuery<Doc> = {}
  
  const client = getClient()
  const tableDescriptor = client.findOne<Viewlet>(view.class.Viewlet, { attachTo: recruit.mixin.Candidate, descriptor: view.viewlet.Table })
  
  function showCreateDialog (ev: Event) {
    showPopup(CreateCandidate, { space: recruit.space.CandidatesPublic }, ev.target as HTMLElement)
  }
  
  let category: Ref<TagCategory> | undefined = undefined
  
  let documentIds:Ref<Doc>[] = []
  async function updateResultQuery (search: string, documentIds:Ref<Doc>[]): Promise<void> {
    resultQuery = (search === '') ? { } : { $search: search }
    if (documentIds.length > 0) {
      resultQuery._id = { $in: documentIds }
    }
  }

  // Find all tags for object classe with matched elements
  const query = createQuery()

  $: query.query(tags.class.TagReference, { tag: { $in: $selectedTagElements } }, (result) => {
    documentIds = Array.from(new Set<Ref<Doc>>(result.map(it => it.attachedTo)).values())
  })

  $: updateResultQuery(search, documentIds)

  function updateCategory (detail: {category: Ref<TagCategory> | null, elements: TagElement[] }) {
    console.log(detail)
    category = detail.category ?? undefined
    selectedTagElements.set(Array.from(detail.elements ?? []).map(it => it._id))
  }
</script>

<div class="ac-header full">
  <div class="ac-header__wrap-title">
    <div class="ac-header__icon"><Icon icon={contact.icon.Person} size={'small'} /></div>
    <span class="ac-header__title"><Label label={recruit.string.Candidates} /></span>
  </div>

  <SearchEdit bind:value={search} on:change={() => {
    updateResultQuery(search, documentIds)
  }} />
  <Button label={recruit.string.Create} primary={true} size={'small'} on:click={(ev) => showCreateDialog(ev)} />
</div>

<Component is={tags.component.TagsCategoryBar} props={{ targetClass: recruit.mixin.Candidate, category }} on:change={(evt) => updateCategory(evt.detail) }/>

<ScrollBox vertical stretch noShift>
  {#await tableDescriptor then descr}
    {#if descr}
      <Table 
        _class={recruit.mixin.Candidate}
        config={descr.config}
        options={descr.options}
        query={ resultQuery }
        enableChecking
      />
    {/if}
  {/await}
</ScrollBox>
<div class="ac-body__space-3" />
