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

  async function onClose({ detail: dependencyIssue }: CustomEvent<Issue | undefined | null>): Promise<void> {
    const vv = Array.isArray(value) ? value : [value]
    for (const docValue of vv) {
      if (
        '_class' in docValue &&
        dependencyIssue !== undefined &&
        dependencyIssue?._id !== docValue.attachedToDependency &&
        dependencyIssue?._id !== docValue._id
      ) {
        let rank: Rank | null = null

        if (dependencyIssue) {
          const lastAttachedIssue = await client.findOne<Issue>(
            tracker.class.Issue,
            { attachedToDependency: dependencyIssue._id },
            { sort: { rank: SortingOrder.Descending } }
          )

          rank = makeRank(lastAttachedIssue?.rank, undefined)
        }

        await client.update(docValue, {
          attachedToDependency: dependencyIssue === null ? tracker.ids.NoDependency : dependencyIssue._id,
          ...(rank ? { rank } : {})
        })
      }
    }

    dispatch('close', dependencyIssue)
  }

  $: selected = !Array.isArray(value) ? ('attachedTo' in value ? value.attachedToDependency : undefined) : undefined
  $: ignoreObjects = !Array.isArray(value) ? ('_id' in value ? [value._id] : []) : undefined
  $: docQuery = {
    'dependency.dependencyId': {
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
  placeholder={tracker.string.SetDependency}
  create={undefined}
  {ignoreObjects}
  shadows={true}
  {width}
  searchMode={'fulltext'}
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
