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
  import type { Class, Doc, Ref, WithLookup } from '@anticrm/core'
  import { BuildModelKey } from '@anticrm/view'
  import {
    ActionContext,
    focusStore,
    ListSelectionProvider,
    SelectDirection,
    selectionStore,
    LoadingProps
  } from '@anticrm/view-resources'
  import IssuesList from './IssuesList.svelte'
  import { Issue, IssueStatus, Team } from '@anticrm/tracker'
  import { Employee } from '@anticrm/contact'
  import { onMount } from 'svelte'
  import { IssuesGroupByKeys, IssuesOrderByKeys } from '../../utils'

  export let _class: Ref<Class<Doc>>
  export let baseMenuClass: Ref<Class<Doc>> | undefined = undefined
  export let itemsConfig: (BuildModelKey | string)[]
  export let currentSpace: Ref<Team> | undefined = undefined
  export let groupByKey: IssuesGroupByKeys | undefined = undefined
  export let orderBy: IssuesOrderByKeys
  export let statuses: WithLookup<IssueStatus>[]
  export let employees: (WithLookup<Employee> | undefined)[] = []
  export let categories: any[] = []
  export let groupedIssues: { [key: string | number | symbol]: Issue[] } = {}
  export let loadingProps: LoadingProps | undefined = undefined

  const listProvider = new ListSelectionProvider((offset: 1 | -1 | 0, of?: Doc, dir?: SelectDirection) => {
    if (dir === 'vertical') {
      issuesList.onElementSelected(offset, of)
    }
  })

  let issuesList: IssuesList

  $: if (issuesList !== undefined) listProvider.update(Object.values(groupedIssues).flat(1))

  onMount(() => {
    ;(document.activeElement as HTMLElement)?.blur()
  })
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>

<IssuesList
  bind:this={issuesList}
  {_class}
  {baseMenuClass}
  {currentSpace}
  {groupByKey}
  {orderBy}
  {statuses}
  {employees}
  {categories}
  {itemsConfig}
  {groupedIssues}
  {loadingProps}
  selectedObjectIds={$selectionStore ?? []}
  selectedRowIndex={listProvider.current($focusStore)}
  on:row-focus={(event) => {
    listProvider.updateFocus(event.detail ?? undefined)
  }}
  on:check={(event) => {
    listProvider.updateSelection(event.detail.docs, event.detail.value)
  }}
/>
