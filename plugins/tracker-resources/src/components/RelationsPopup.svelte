<script lang="ts">
  import chunter from '@hcengineering/chunter'
  import { Class, Doc, Ref, RelatedDocument } from '@hcengineering/core'
  import { getResource, IntlString } from '@hcengineering/platform'
  import { createQuery, getClient, ObjectSearchPopup, ObjectSearchResult } from '@hcengineering/presentation'
  import { Issue } from '@hcengineering/tracker'
  import { Action, closePopup, Menu, showPopup } from '@hcengineering/ui'
  import { updateIssueRelation } from '../issues'
  import tracker from '../plugin'

  export let value: Issue

  const client = getClient()
  const query = createQuery()
  $: relations = {
    blockedBy: value.blockedBy ?? [],
    relations: value.relations ?? [],
    isBlocking: isBlocking ?? []
  }
  let isBlocking: { _id: Ref<Issue>; _class: Ref<Class<Doc>> }[] = []
  $: query.query(value._class, { 'blockedBy._id': value._id }, (result) => {
    isBlocking = result.map(({ _id, _class }) => ({ _id, _class }))
  })
  $: hasRelation = Object.values(relations).some(({ length }) => length)

  async function updateRelation (
    refDocument: Doc,
    type: keyof typeof relations,
    operation: '$push' | '$pull',
    _: IntlString
  ) {
    const prop = type === 'isBlocking' ? 'blockedBy' : type
    if (type !== 'isBlocking') {
      await updateIssueRelation(client, value, refDocument, prop, operation)
    }
    if (client.getHierarchy().isDerived(refDocument._class, tracker.class.Issue)) {
      if (type !== 'blockedBy') {
        await updateIssueRelation(client, refDocument as Issue, value, prop, operation)
      }

      return
    }
    const update = await getResource(chunter.backreference.Update)

    let docs: RelatedDocument[] = []
    let label: IntlString = tracker.string.RemoveRelation
    switch (type) {
      case 'blockedBy':
        docs = [...(value.blockedBy ?? [])]
        label = tracker.string.AddedAsBlocking
        break
      case 'relations':
        docs = [...(value.relations ?? [])]
        label = tracker.string.AddedReference
        break
      case 'isBlocking':
        docs = isBlocking ?? []
        label = tracker.string.AddedAsBlocked
        break
    }

    const pos = docs.findIndex((it) => it._id === refDocument._id)
    if (operation === '$push' && pos === -1) {
      docs.push(refDocument)
    }
    if (operation === '$pull' && pos !== -1) {
      docs.splice(pos, 1)
    }
    await update(value, type, docs, label)
  }

  const makeAddAction = (type: keyof typeof relations, placeholder: IntlString) => async () => {
    closePopup('popup')
    showPopup(
      ObjectSearchPopup,
      { ignore: [value, ...relations[type]], label: placeholder },
      'top',
      async (issue: ObjectSearchResult | undefined) => {
        if (!issue) return
        await updateRelation(issue.doc, type, '$push', placeholder)
      }
    )
  }
  async function removeRelation () {
    closePopup('popup')
    showPopup(
      ObjectSearchPopup,
      {
        label: tracker.string.RemoveRelation,
        relatedDocuments: [...relations.blockedBy, ...relations.isBlocking, ...relations.relations]
      },
      'top',
      async (result: { type: keyof typeof relations; doc: Doc } | undefined) => {
        if (!result) return
        await updateRelation(result.doc, result.type, '$pull', tracker.string.RemoveRelation)
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
      action: makeAddAction('relations', tracker.string.RelatedIssueSearchPlaceholder),
      icon: tracker.icon.Issue,
      label: tracker.string.AddRelatedIssue
    },
    ...(hasRelation ? removeRelationAction : [])
  ]
</script>

{#if actions}
  <Menu {actions} on:changeContent />
{/if}
