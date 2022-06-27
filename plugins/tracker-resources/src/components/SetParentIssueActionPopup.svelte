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
  import { AttachedData, DocumentQuery, FindOptions, SortingOrder } from '@anticrm/core'
  import { getClient, ObjectPopup } from '@anticrm/presentation'
  import { calcRank, Issue, IssueStatusCategory } from '@anticrm/tracker'
  import { Icon } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../plugin'
  import { getIssueId } from '../utils'

  export let value: Issue | AttachedData<Issue> | Issue[]
  export let width: 'medium' | 'large' | 'full' = 'large'

  const client = getClient()

  const dispatch = createEventDispatcher()
  const docQuery: DocumentQuery<Issue> = '_id' in value ? { 'parents.parentId': { $nin: [value._id] } } : {}
  const options: FindOptions<Issue> = {
    lookup: { status: tracker.class.IssueStatus, space: tracker.class.Team },
    sort: { modifiedOn: SortingOrder.Descending }
  }

  let statusCategoryById: Map<string, IssueStatusCategory> | undefined

  async function updateIssueStatusCategories () {
    const categories = await client.findAll(tracker.class.IssueStatusCategory, {})

    statusCategoryById = new Map(categories.map((c) => [c._id, c]))
  }

  async function onClose ({ detail: parentIssue }: CustomEvent<Issue | undefined | null>) {
    const vv = Array.isArray(value) ? value : [value]
    for (const docValue of vv) {
      if ('_id' in docValue && parentIssue !== undefined && parentIssue?._id !== docValue.attachedTo) {
        let rank: string | null = null

        if (parentIssue) {
          const lastAttachedIssue = await client.findOne<Issue>(
            tracker.class.Issue,
            { attachedTo: parentIssue._id },
            { sort: { rank: SortingOrder.Descending } }
          )

          rank = calcRank(lastAttachedIssue, undefined)
        }

        await client.update(docValue, {
          attachedTo: parentIssue === null ? tracker.ids.NoParent : parentIssue._id,
          ...(rank ? { rank } : {})
        })
      }
    }

    dispatch('close', parentIssue)
  }

  $: selected = !Array.isArray(value) ? ('attachedTo' in value ? value.attachedTo : undefined) : undefined
  $: ignoreObjects = !Array.isArray(value) ? ('_id' in value ? [value._id] : []) : undefined
  $: updateIssueStatusCategories()
</script>

<ObjectPopup
  _class={tracker.class.Issue}
  {options}
  {docQuery}
  {selected}
  multiSelect={false}
  allowDeselect={true}
  placeholder={tracker.string.SetParent}
  create={undefined}
  {ignoreObjects}
  shadows={true}
  {width}
  searchField="title"
  on:update
  on:close={onClose}
>
  <svelte:fragment slot="item" let:item={issue}>
    {@const { icon } = statusCategoryById?.get(issue.$lookup?.status.category) ?? {}}
    {@const issueId = getIssueId(issue.$lookup.space, issue)}
    {#if issueId && icon}
      <div class="flex-center clear-mins w-full h-9">
        <div class="icon mr-4 h-8">
          <Icon {icon} size="small" />
        </div>
        <span class="overflow-label flex-no-shrink mr-3">{issueId}</span>
        <span class="overflow-label w-full issue-title">{issue.title}</span>
      </div>
    {/if}
  </svelte:fragment>
</ObjectPopup>

<style lang="scss">
  .issue-title {
    color: var(--theme-content-color);
  }
</style>
