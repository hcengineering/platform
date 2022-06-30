<script lang="ts">
  import { Ref } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { Issue } from '@anticrm/tracker'
  import { Action, Menu, showPopup } from '@anticrm/ui'
  import SelectIssuePopup from './SelectIssuePopup.svelte'
  import SelectRelationPopup from './SelectRelationPopup.svelte'
  import tracker from '../plugin'

  export let value: Issue

  const client = getClient()
  const query = createQuery()
  let isBlocking: Ref<Issue>[] = []
  $: query.query(tracker.class.Issue, { blockedBy: value._id }, (result) => {
    isBlocking = result.map(({ _id }) => _id)
  })
  $: hasRelation = (value.blockedBy?.length || value.relatedIssue?.length || isBlocking.length) > 0

  async function pushOrUpdate (issue: Issue, prop: 'blockedBy' | 'relatedIssue', _id: Ref<Issue>) {
    const update = Array.isArray(value[prop]) ? { $push: { [prop]: _id } } : { [prop]: [_id] }
    await client.update(issue, update)
  }

  function makeProps (ignoreObjects: Ref<Issue>[] | undefined) {
    return { ignoreObjects: ignoreObjects === undefined ? [value._id] : [...ignoreObjects, value._id] }
  }
  async function addBlockedBy () {
    showPopup(SelectIssuePopup, makeProps(value.blockedBy), undefined, async (issue: Issue | undefined) => {
      if (!issue) return
      await pushOrUpdate(value, 'blockedBy', issue._id)
    })
  }
  async function addIsBlocking () {
    showPopup(SelectIssuePopup, makeProps(isBlocking), undefined, async (issue: Issue | undefined) => {
      if (!issue) return
      await pushOrUpdate(issue, 'blockedBy', value._id)
    })
  }
  async function addRelatedIssue () {
    showPopup(SelectIssuePopup, makeProps(value.relatedIssue), undefined, async (issue: Issue | undefined) => {
      if (!issue) return
      await pushOrUpdate(issue, 'relatedIssue', value._id)
      await pushOrUpdate(value, 'relatedIssue', issue._id)
    })
  }
  async function removeRelation () {
    showPopup(
      SelectRelationPopup,
      { blockedBy: value.blockedBy, relatedIssue: value.relatedIssue, isBlocking },
      undefined,
      async (e: { type: string; issue: Issue } | undefined) => {
        if (!e) return
        const { type, issue } = e
        if (type === 'blockedBy') await client.update(value, { $pull: { blockedBy: issue._id } })
        else if (type === 'isBlocking') await client.update(issue, { $pull: { blockedBy: value._id } })
        else if (type === 'relatedIssue') {
          await client.update(issue, { $pull: { relatedIssue: value._id } })
          await client.update(value, { $pull: { relatedIssue: issue._id } })
        }
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
      action: addBlockedBy,
      icon: tracker.icon.Issue,
      label: tracker.string.AddBlockedBy
    },
    {
      action: addIsBlocking,
      icon: tracker.icon.Issue,
      label: tracker.string.AddIsBlocking
    },
    {
      action: addRelatedIssue,
      icon: tracker.icon.Issue,
      label: tracker.string.AddRelatedIssue
    },
    ...(hasRelation ? removeRelationAction : [])
  ]
</script>

<Menu {actions} />
