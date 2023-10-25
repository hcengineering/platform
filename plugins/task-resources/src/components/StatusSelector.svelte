<script lang="ts">
  import { Attribute, Class, IdMap, Ref, Status } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { DocPopup, createQuery, getClient } from '@hcengineering/presentation'
  import { Project, ProjectType, Task, getStates } from '@hcengineering/task'
  import { ObjectPresenter, statusStore } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import { typeStore } from '..'
  import task from '../plugin'

  export let value: Task | Task[]
  export let width: 'medium' | 'large' | 'full' = 'medium'
  export let placeholder: IntlString
  export let ofAttribute: Ref<Attribute<Status>>
  export let _class: Ref<Class<Status>>
  export let embedded: boolean = false

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

  function updateStatuses (
    space: Project | undefined,
    types: IdMap<ProjectType>,
    store: IdMap<Status>,
    allStatuses: Status[]
  ): void {
    if (space === undefined) {
      statuses = allStatuses.filter((p) => p.ofAttribute === ofAttribute)
    } else {
      statuses = getStates(space, types, store)
    }
  }

  $: updateStatuses(project, $typeStore, $statusStore.byId, $statusStore.array)

  let statuses: Status[] = []
</script>

<DocPopup
  {_class}
  objects={statuses}
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
</DocPopup>
