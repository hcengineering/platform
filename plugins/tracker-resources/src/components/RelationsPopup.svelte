<script lang="ts">
  import { Ref } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { Issue } from '@anticrm/tracker'
  import { Action, closePopup, Menu, showPopup } from '@anticrm/ui'
  import SelectIssuePopup from './SelectIssuePopup.svelte'
  import SelectRelationPopup from './SelectRelationPopup.svelte'
  import tracker from '../plugin'
  import { updateIssueRelation } from '../issues'
  import { IntlString } from '@anticrm/platform'

  export let value: Issue

  const client = getClient()
  const query = createQuery()
  $: relations = {
    blockedBy: value.blockedBy ?? [],
    relatedIssue: value.relatedIssue ?? [],
    isBlocking: isBlocking ?? []
  }
  let isBlocking: Ref<Issue>[] = []
  $: query.query(tracker.class.Issue, { blockedBy: value._id }, (result) => {
    isBlocking = result.map(({ _id }) => _id)
  })
  $: hasRelation = Object.values(relations).some(({ length }) => length)

  async function updateRelation (issue: Issue, type: keyof typeof relations, operation: '$push' | '$pull') {
    const prop = type === 'isBlocking' ? 'blockedBy' : type
    if (type !== 'isBlocking') {
      await updateIssueRelation(client, value, issue._id, prop, operation)
    }
    if (type !== 'blockedBy') {
      await updateIssueRelation(client, issue, value._id, prop, operation)
    }
  }

  const makeAddAction = (type: keyof typeof relations, placeholder: IntlString) => async () => {
    closePopup('popup')
    showPopup(
      SelectIssuePopup,
      { ignoreObjects: [value._id, ...relations[type]], placeholder },
      undefined,
      async (issue: Issue | undefined) => {
        if (!issue) return
        await updateRelation(issue, type, '$push')
      }
    )
  }
  async function removeRelation () {
    closePopup('popup')
    showPopup(
      SelectRelationPopup,
      relations,
      undefined,
      async (result: { type: keyof typeof relations; issue: Issue } | undefined) => {
        if (!result) return
        await updateRelation(result.issue, result.type, '$pull')
      }
    )
  }

  const removeRelationAction: Action[] = [
    {
      action: removeRelation,
      icon: tracker.icon.Issue,
      label: tracker.string.RemoveRelation,
      group: '1'
    }
  ]
  $: actions = [
    {
      action: makeAddAction('blockedBy', tracker.string.BlockedBySearchPlaceholder),
      icon: tracker.icon.Issue,
      label: tracker.string.AddBlockedBy
    },
    {
      action: makeAddAction('isBlocking', tracker.string.IsBlockingSearchPlaceholder),
      icon: tracker.icon.Issue,
      label: tracker.string.AddIsBlocking
    },
    {
      action: makeAddAction('relatedIssue', tracker.string.RelatedIssueSearchPlaceholder),
      icon: tracker.icon.Issue,
      label: tracker.string.AddRelatedIssue
    },
    ...(hasRelation ? removeRelationAction : [])
  ]
</script>

<Menu {actions} />
