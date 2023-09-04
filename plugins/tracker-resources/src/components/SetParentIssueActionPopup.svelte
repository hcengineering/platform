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
  import core, { AttachedData, FindOptions, Ref, SortingOrder } from '@hcengineering/core'
  import { getClient, ObjectPopup } from '@hcengineering/presentation'
  import { calcRank, Issue, IssueDraft } from '@hcengineering/tracker'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../plugin'
  import { getIssueId } from '../issues'
  import IssueStatusIcon from './issues/IssueStatusIcon.svelte'

  export let value: Issue | AttachedData<Issue> | Issue[] | IssueDraft
  export let width: 'medium' | 'large' | 'full' = 'large'

  const client = getClient()
  const dispatch = createEventDispatcher()
  const options: FindOptions<Issue> = {
    lookup: {
      space: tracker.class.Project,
      status: [tracker.class.IssueStatus, { category: core.class.StatusCategory }]
    },
    sort: { modifiedOn: SortingOrder.Descending }
  }

  async function onClose ({ detail: parentIssue }: CustomEvent<Issue | undefined | null>) {
    const vv = Array.isArray(value) ? value : [value]
    for (const docValue of vv) {
      if (
        '_class' in docValue &&
        parentIssue !== undefined &&
        parentIssue?._id !== docValue.attachedTo &&
        parentIssue?._id !== docValue._id
      ) {
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
  $: docQuery = {
    'parents.parentId': {
      $nin: [
        ...new Set(
          (Array.isArray(value) ? value : [value])
            .map((issue) => ('_id' in issue ? issue._id : null))
            .filter((x): x is Ref<Issue> => x !== null)
        )
      ]
    }
  }
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
  noSearchField
  on:update
  on:close={onClose}
>
  <svelte:fragment slot="item" let:item={issue}>
    {@const issueId = getIssueId(issue.$lookup.space, issue)}
    {#if issueId}
      <div class="flex-center clear-mins w-full h-9">
        {#if issue?.$lookup?.status}
          <div class="icon mr-4 h-8">
            <IssueStatusIcon value={issue.$lookup.status} space={issue.space} size="small" />
          </div>
        {/if}
        <span class="overflow-label flex-no-shrink mr-3">{issueId}</span>
        <span class="overflow-label w-full content-color">{issue.title}</span>
      </div>
    {/if}
  </svelte:fragment>
</ObjectPopup>
