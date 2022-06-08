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
  import { FindOptions, SortingOrder } from '@anticrm/core'
  import { Issue, IssueStatusCategory, Team } from '@anticrm/tracker'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { Icon } from '@anticrm/ui'
  import ObjectPopup from '@anticrm/presentation/src/components/ObjectPopup.svelte'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../plugin'
  import { getIssueId } from '../utils'

  export let value: Issue
  export let shouldSaveOnChange = true

  const client = getClient()
  const spaceQuery = createQuery()
  const dispatch = createEventDispatcher()
  const options: FindOptions<Issue> = {
    lookup: { status: tracker.class.IssueStatus },
    sort: { modifiedOn: SortingOrder.Descending }
  }

  let team: Team | undefined
  let statusCategoryById: Map<string, IssueStatusCategory> | undefined

  async function updateIssueStatusCategories () {
    const categories = await client.findAll(tracker.class.IssueStatusCategory, {})

    statusCategoryById = new Map(categories.map((c) => [c._id, c]))
  }

  async function onClose ({ detail: parentIssue }: CustomEvent<Issue | undefined | null>) {
    if (shouldSaveOnChange && parentIssue !== undefined && parentIssue?._id !== value.attachedTo) {
      await client.updateCollection(
        value._class,
        value.space,
        value._id,
        value.attachedTo,
        value.attachedToClass,
        'subIssues',
        { attachedTo: parentIssue === null ? tracker.ids.NoParent : parentIssue._id }
      )
    }

    dispatch('close', parentIssue)
  }

  $: ignoreObjects = value._id ? [value._id] : []
  $: updateIssueStatusCategories()
  $: if (value.space) {
    spaceQuery.query(tracker.class.Team, { _id: value.space }, (res) => ([team] = res))
  }
</script>

<ObjectPopup
  _class={tracker.class.Issue}
  {options}
  selected={value.attachedTo}
  multiSelect={false}
  allowDeselect={true}
  placeholder={tracker.string.SetParent}
  create={undefined}
  {ignoreObjects}
  shadows={true}
  width="large"
  searchField="title"
  on:update
  on:close={onClose}
>
  <svelte:fragment slot="item" let:item={issue}>
    {@const { icon } = statusCategoryById?.get(issue.$lookup?.status.category) ?? {}}
    {@const issueId = team && getIssueId(team, issue)}
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
