<script lang="ts">
  import core, { DocumentQuery, FindOptions, SortingOrder } from '@hcengineering/core'
  import { ObjectPopup, createQuery, getClient } from '@hcengineering/presentation'
  import { Issue, IssueStatus, Project } from '@hcengineering/tracker'
  import { Label, resizeObserver } from '@hcengineering/ui'
  import { ObjectPresenter } from '@hcengineering/view-resources'
  import view from '@hcengineering/view-resources/src/plugin'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'

  export let value: Issue | Issue[]
  const queryOptions: FindOptions<IssueStatus> = {
    lookup: {
      category: core.class.StatusCategory
    },
    sort: { category: SortingOrder.Ascending, name: SortingOrder.Ascending }
  }
  const placeholder = tracker.string.SetStatus

  const dispatch = createEventDispatcher()
  const client = getClient()
  const changeStatus = async (newStatus: any) => {
    if (newStatus === undefined) {
      dispatch('close', undefined)
      return
    }
    const docs = Array.isArray(value) ? value : [value]

    const changed = (d: Issue) => d.status !== newStatus
    await Promise.all(
      docs.filter(changed).map((it) => {
        return client.update(it, { status: newStatus })
      })
    )

    dispatch('close', newStatus)
  }

  $: current = Array.isArray(value)
    ? value.every((v) => v.status === (value as Array<Issue>)[0].status)
      ? (value as Array<Issue>)[0].status
      : undefined
    : value.status

  let finalQuery: DocumentQuery<IssueStatus> = {}

  let docMatch = true

  $: _space = Array.isArray(value)
    ? value.every((v) => v.space === (value as Array<Issue>)[0].space)
      ? (value as Array<Issue>)[0].space
      : undefined
    : value.space

  let project: Project | undefined

  const query = createQuery()
  $: _space ? query.query(tracker.class.Project, { _id: _space }, (res) => (project = res[0])) : (project = undefined)

  function updateQuery (space: Project | undefined): void {
    if (space === undefined) {
      finalQuery = { ofAttribute: tracker.attribute.IssueStatus }
    } else {
      finalQuery = { ofAttribute: tracker.attribute.IssueStatus, _id: { $in: space.states } }
    }
    docMatch = true
  }

  $: updateQuery(project)
</script>

{#if docMatch}
  <ObjectPopup
    _class={tracker.class.IssueStatus}
    docQuery={finalQuery}
    options={queryOptions}
    allowDeselect={true}
    selected={current}
    on:close={(evt) => {
      changeStatus(evt.detail === null ? null : evt.detail?._id)
    }}
    {placeholder}
    on:changeContent
  >
    <svelte:fragment slot="item" let:item>
      <div class="flex-row-center flex-grow overflow-label">
        <ObjectPresenter
          objectId={item._id}
          _class={item._class}
          value={item}
          inline={false}
          noUnderline
          props={{ disabled: true, inline: false, size: 'small', avatarSize: 'smaller' }}
        />
      </div>
    </svelte:fragment>
  </ObjectPopup>
{:else}
  <div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
    <div class="flex-center w-60 h-18">
      <Label label={view.string.DontMatchCriteria} />
    </div>
  </div>
{/if}
