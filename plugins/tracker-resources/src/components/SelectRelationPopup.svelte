<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { Ref } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import { Issue } from '@anticrm/tracker'
  import { SelectPopup, Loading } from '@anticrm/ui'
  import { translate } from '@anticrm/platform'
  import { getIssueId } from '../issues'
  import tracker from '../plugin'

  export let blockedBy: Ref<Issue>[] = []
  export let isBlocking: Ref<Issue>[] = []
  export let relatedIssue: Ref<Issue>[] = []

  // TODO: fix icons
  const config = {
    blockedBy: {
      label: tracker.string.BlockedIssue,
      icon: tracker.icon.Issue
    },
    isBlocking: {
      label: tracker.string.BlockingIssue,
      icon: tracker.icon.Issues
    },
    relatedIssue: {
      label: tracker.string.RelatedIssue,
      icon: tracker.icon.Team
    }
  }

  const client = getClient()
  const dispatch = createEventDispatcher()

  async function getValue () {
    const issues = await client.findAll(
      tracker.class.Issue,
      { _id: { $in: [...blockedBy, ...isBlocking, ...relatedIssue] } },
      { lookup: { space: tracker.class.Team } }
    )
    const valueFactory = (type: keyof typeof config) => async (issueId: Ref<Issue>) => {
      const issue = issues.find(({ _id }) => _id === issueId)
      if (!issue?.$lookup?.space) return
      const { label, icon } = config[type]
      const text = await translate(label, { id: getIssueId(issue.$lookup.space, issue), title: issue.title })
      return { text, icon, issue, type }
    }
    return (
      await Promise.all([
        ...blockedBy.map(valueFactory('blockedBy')),
        ...isBlocking.map(valueFactory('isBlocking')),
        ...relatedIssue.map(valueFactory('relatedIssue'))
      ])
    ).map((val, id) => ({ ...val, id }))
  }
</script>

{#await getValue()}
  <Loading />
{:then value}
  <SelectPopup
    {value}
    width="large"
    searchable
    placeholder={tracker.string.RemoveRelation}
    on:close={(e) => {
      if (e.detail === undefined) dispatch('close')
      else dispatch('close', value[e.detail])
    }}
  />
{/await}
