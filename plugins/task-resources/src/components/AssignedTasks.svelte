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
  import { EmployeeAccount } from '@hcengineering/contact'
  import { Class, DocumentQuery, getCurrentAccount, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import tags, { selectedTagElements, TagCategory, TagElement } from '@hcengineering/tags'
  import { DoneState, Task } from '@hcengineering/task'
  import { Component, Label, SearchEdit } from '@hcengineering/ui'
  import { TableBrowser } from '@hcengineering/view-resources'
  import task from '../plugin'

  export let _class: Ref<Class<Task>> = task.class.Task
  export let labelTasks = task.string.Tasks

  let search = ''
  let resultQuery: DocumentQuery<Task> = {}

  const client = getClient()
  const currentUser = getCurrentAccount() as EmployeeAccount

  let category: Ref<TagCategory> | undefined = undefined

  let documentIds: Ref<Task>[] = []
  function updateResultQuery (search: string, documentIds: Ref<Task>[], doneStates: DoneState[]): void {
    resultQuery = search === '' ? {} : { $search: search }
    resultQuery.assignee = currentUser.employee
    resultQuery.doneState = { $nin: doneStates.map((it) => it._id) }
    if (documentIds.length > 0) {
      resultQuery._id = { $in: documentIds }
    }
  }

  let doneStates: DoneState[] = []

  const doneStateQuery = createQuery()
  doneStateQuery.query(task.class.DoneState, {}, (res) => (doneStates = res))

  // Find all tags for object class with matched elements
  const query = createQuery()

  $: query.query(tags.class.TagReference, { tag: { $in: $selectedTagElements } }, (result) => {
    documentIds = Array.from(
      new Set<Ref<Task>>(
        result
          .filter((it) => client.getHierarchy().isDerived(it.attachedToClass, _class))
          .map((it) => it.attachedTo as Ref<Task>)
      ).values()
    )
  })

  $: updateResultQuery(search, documentIds, doneStates)

  function updateCategory (detail: { category: Ref<TagCategory> | null; elements: TagElement[] }) {
    category = detail.category ?? undefined
    selectedTagElements.set(Array.from(detail.elements ?? []).map((it) => it._id))
  }
  const handleChange = (evt: any) => updateCategory(evt.detail)
</script>

<div class="ac-header full divide caption-height">
  <div class="ac-header__wrap-title">
    <span class="ac-header__title"><Label label={labelTasks} /></span>
  </div>

  <SearchEdit
    bind:value={search}
    on:change={() => {
      updateResultQuery(search, documentIds, doneStates)
    }}
  />
</div>

<Component is={tags.component.TagsCategoryBar} props={{ targetClass: _class, category }} on:change={handleChange} />

<TableBrowser
  {_class}
  config={['', 'attachedTo', 'assignee', 'state', 'doneState', 'attachments', 'comments', 'modifiedOn']}
  query={resultQuery}
  showNotification
/>
