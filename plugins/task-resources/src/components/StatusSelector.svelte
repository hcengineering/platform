<script lang="ts">
  import core, {
    Attribute,
    Class,
    DocumentQuery,
    FindOptions,
    IdMap,
    Ref,
    SortingOrder,
    Status
  } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { ObjectPopup, createQuery, getClient } from '@hcengineering/presentation'
  import { Project, ProjectType, Task, getStates } from '@hcengineering/task'
  import { Label, resizeObserver } from '@hcengineering/ui'
  import { ObjectPresenter, statusStore } from '@hcengineering/view-resources'
  import view from '@hcengineering/view-resources/src/plugin'
  import { createEventDispatcher } from 'svelte'
  import { typeStore } from '..'
  import task from '../plugin'

  export let value: Task | Task[]
  export let width: 'medium' | 'large' | 'full' = 'medium'
  export let placeholder: IntlString
  export let ofAttribute: Ref<Attribute<Status>>
  export let _class: Ref<Class<Status>>
  export let embedded: boolean = false

  const queryOptions: FindOptions<Status> = {
    lookup: {
      category: core.class.StatusCategory
    },
    sort: { category: SortingOrder.Ascending, name: SortingOrder.Ascending }
  }

  const dispatch = createEventDispatcher()
  const client = getClient()
  const changeStatus = async (newStatus: any) => {
    if (newStatus === undefined) {
      dispatch('close', undefined)
      return
    }
    const docs = Array.isArray(value) ? value : [value]

    const changed = (d: Task) => d.status !== newStatus
    await Promise.all(
      docs.filter(changed).map((it) => {
        return client.update(it, { status: newStatus })
      })
    )

    dispatch('close', newStatus)
  }

  $: current = Array.isArray(value)
    ? value.every((v) => v.status === (value as Array<Task>)[0].status)
      ? (value as Array<Task>)[0].status
      : undefined
    : value.status

  let finalQuery: DocumentQuery<Status> = {}

  let docMatch = true

  $: _space = Array.isArray(value)
    ? value.every((v) => v.space === (value as Array<Task>)[0].space)
      ? (value as Array<Task>)[0].space
      : undefined
    : value.space

  let project: Project | undefined

  const query = createQuery()
  $: _space
    ? query.query(task.class.Project, { _id: _space as Ref<Project> }, (res) => (project = res[0]))
    : (project = undefined)

  function updateQuery (space: Project | undefined, types: IdMap<ProjectType>, store: IdMap<Status>): void {
    if (space === undefined) {
      finalQuery = { ofAttribute }
    } else {
      finalQuery = {
        ofAttribute,
        _id: { $in: getStates(space, types, store).map((p) => p._id) }
      }
    }
    docMatch = true
  }

  $: updateQuery(project, $typeStore, $statusStore.byId)
</script>

{#if docMatch}
  <ObjectPopup
    {_class}
    docQuery={finalQuery}
    options={queryOptions}
    allowDeselect={true}
    selected={current}
    on:close={(evt) => {
      changeStatus(evt.detail === null ? null : evt.detail?._id)
    }}
    {placeholder}
    {width}
    {embedded}
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
