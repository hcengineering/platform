<script lang="ts">
  import chunter from '@hcengineering/chunter'
  import { Class, Doc, Ref, RelatedDocument, WithLookup } from '@hcengineering/core'
  import { IntlString, getResource } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Issue } from '@hcengineering/tracker'
  import { Component, Icon, IconClose, navigate } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { getIssueId, issueLinkFragmentProvider, updateIssueRelation } from '../../issues'
  import tracker from '../../plugin'

  export let value: Issue
  export let _class: Ref<Class<Doc>>
  export let documentIds: Ref<Doc>[]
  export let type: 'isBlocking' | 'blockedBy' | 'relations'

  const client = getClient()
  const issuesQuery = createQuery()

  // TODO: fix icon
  $: icon = tracker.icon.Issue
  $: query =
    type === 'isBlocking' ? { blockedBy: { _id: value._id, _class: value._class } } : { _id: { $in: documentIds } }

  $: isIssue = client.getHierarchy().isDerived(_class, tracker.class.Issue)
  let documents: WithLookup<Doc>[] = []
  $: issuesQuery.query(
    _class,
    query,
    (result) => {
      documents = result
    },
    { lookup: isIssue ? { space: tracker.class.Project } : {} }
  )

  async function handleClick (issue: RelatedDocument) {
    const prop = type === 'isBlocking' ? 'blockedBy' : type
    const isBlockingValue = await client.findAll(value._class, { 'blockedBy._id': value._id })

    if (type !== 'isBlocking') {
      await updateIssueRelation(client, value, issue, prop, '$pull')
    }
    if (type !== 'blockedBy' && _class === tracker.class.Issue) {
      const issueDoc = (await client.findOne(issue._class, { _id: issue._id })) as Issue
      await updateIssueRelation(client, issueDoc, value, prop, '$pull')
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
        docs = isBlockingValue
        label = tracker.string.AddedAsBlocked
        break
    }

    const pos = docs.findIndex((it) => it._id === issue._id)
    if (pos !== -1) {
      docs.splice(pos, 1)
    }
    await update(value, type, docs, label)
  }

  async function handleRedirect (issue: Issue) {
    const loc = await issueLinkFragmentProvider(issue)
    navigate(loc)
  }

  const asIssue = (x: Doc) => x as WithLookup<Issue>
</script>

{#each documents as doc}
  {#if isIssue}
    {@const issue = asIssue(doc)}
    {#if issue.$lookup?.space}
      <div class="tag-container">
        <Icon {icon} size={'small'} />
        <div class="flex-grow">
          <button on:click|stopPropagation={() => handleRedirect(issue)}>
            <span class="overflow-label ml-1-5 content-color">{getIssueId(issue.$lookup.space, issue)}</span>
          </button>
        </div>
        <button class="btn-close" on:click|stopPropagation={() => handleClick(issue)}>
          <Icon icon={IconClose} size={'x-small'} />
        </button>
      </div>
    {/if}
  {:else}
    <div class="tag-container between">
      <Component
        is={view.component.ObjectPresenter}
        props={{ objectId: doc._id, _class: doc._class, value: doc, noUnderline: true, props: { avatarSize: 'card' } }}
      />
      <button class="btn-close" on:click|stopPropagation={() => handleClick(doc)}>
        <Icon icon={IconClose} size={'x-small'} />
      </button>
    </div>
  {/if}
{/each}

<style lang="scss">
  .tag-container {
    overflow: hidden;
    display: flex;
    align-items: center;
    // flex-shrink: 0;
    padding-left: 0.75rem;
    height: 2rem;
    min-width: 0;
    min-height: 0;
    font-size: 0.8125rem;
    border-radius: 0.25rem;
    // width: fit-content;
    border: 1px solid transparent;

    &.between {
      justify-content: space-between;
    }
    &:hover {
      background-color: var(--theme-button-hovered);
      border-color: var(--theme-divider-color);
    }

    .btn-close {
      flex-shrink: 0;
      margin-left: 0.125rem;
      padding: 0 0.25rem 0 0.125rem;
      height: 1.75rem;
      color: var(--theme-content-color);
      border-left: 1px solid transparent;

      &:hover {
        color: var(--theme-caption-color);
        border-left-color: var(--theme-divider-color);
      }
    }
  }
</style>
