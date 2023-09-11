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
  import { IssueStatus, Project } from '@hcengineering/tracker'
  import IssueStatusIcon from './IssueStatusIcon.svelte'
  import { createQuery } from '@hcengineering/presentation'
  import core, { IdMap, Ref, Status, StatusCategory, toIdMap } from '@hcengineering/core'
  import { statusStore } from '@hcengineering/view-resources'

  export let value: Ref<IssueStatus>[]
  export let space: Ref<Project> | undefined

  let statuses: IssueStatus[] = []

  let categories: IdMap<StatusCategory> = new Map()
  const categoriesQuery = createQuery()
  categoriesQuery.query(core.class.StatusCategory, {}, (res) => {
    categories = toIdMap(res)
  })

  function sort (value: Ref<IssueStatus>[], store: IdMap<Status>, categories: IdMap<StatusCategory>): IssueStatus[] {
    const result: IssueStatus[] = []
    for (const val of new Set(value)) {
      const res = store.get(val)
      if (res) {
        result.push(res)
      }
    }
    return result.sort((a, b) => {
      if (a.category === undefined) return -1
      if (b.category === undefined) return 1
      const aCat = categories.get(a.category)
      const bCat = categories.get(b.category)
      if (aCat === undefined) return -1
      if (bCat === undefined) return 1
      return aCat.order - bCat.order
    })
  }

  $: statuses = sort(value, $statusStore, categories)
</script>

<div class="flex-presenter flex-gap-1-5">
  {#each statuses as value, i (value._id)}
    {#if value && i < 5}
      <div>
        <IssueStatusIcon {space} {value} size={'small'} />
      </div>
    {/if}
  {/each}
  {#if statuses.length > 5}
    <div>
      +{statuses.length - 5}
    </div>
  {/if}
</div>
