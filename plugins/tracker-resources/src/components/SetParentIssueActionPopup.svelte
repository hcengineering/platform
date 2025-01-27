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
  import core, { AttachedData, FindOptions, type Rank, Ref, SortingOrder } from '@hcengineering/core'
  import { ObjectPopup, getClient } from '@hcengineering/presentation'
  import { makeRank } from '@hcengineering/task'
  import { Issue, IssueDraft } from '@hcengineering/tracker'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../plugin'
  import IssueStatusIcon from './issues/IssueStatusIcon.svelte'

  export let value: Issue | AttachedData<Issue> | Issue[] | IssueDraft
  export let width: 'medium' | 'large' | 'full' = 'large'

  const client = getClient()
  const dispatch = createEventDispatcher()
  const options: FindOptions<Issue> = {
    lookup: {
      status: [tracker.class.IssueStatus, { category: core.class.StatusCategory }]
    },
    sort: { modifiedOn: SortingOrder.Descending }
  }

  async function onClose ({ detail: parentIssue }: CustomEvent<Issue | undefined | null>): Promise<void> {
    const vv = Array.isArray(value) ? value : [value]
    for (const docValue of vv) {
      if (
        '_class' in docValue &&
        parentIssue !== undefined &&
        parentIssue?._id !== docValue.attachedTo &&
        parentIssue?._id !== docValue._id
      ) {
        let rank: Rank | null = null

        if (parentIssue) {
          const lastAttachedIssue = await client.findOne<Issue>(
            tracker.class.Issue,
            { attachedTo: parentIssue._id },
            { sort: { rank: SortingOrder.Descending } }
          )

          rank = makeRank(lastAttachedIssue?.rank, undefined)
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
</script>

<ObjectPopup
  _class={tracker.class.Issue}
  {options}
  {selected}
  category={tracker.completion.IssueCategory}
  multiSelect={false}
  allowDeselect={true}
  placeholder={tracker.string.SetParent}
  create={undefined}
  {ignoreObjects}
  shadows={true}
  {width}
  searchMode={'spotlight'}
  on:update
  on:close={onClose}
>
  <svelte:fragment slot="item" let:item={issue}>
    <div class="flex-center clear-mins w-full h-9">
      {#if issue?.$lookup?.status}
        <div class="icon mr-4 h-8">
          <IssueStatusIcon value={issue.$lookup.status} space={issue.space} size="small" />
        </div>
      {/if}
      <span class="overflow-label flex-no-shrink mr-3">{issue.identifier}</span>
      <span class="overflow-label w-full content-color">{issue.title}</span>
    </div>
  </svelte:fragment>
</ObjectPopup>
