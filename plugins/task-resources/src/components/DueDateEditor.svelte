<script lang="ts">
  import { getClient } from '@hcengineering/presentation'
  import { DueDatePresenter, ButtonSize, ButtonKind } from '@hcengineering/ui'
  import { WithLookup } from '@hcengineering/core'
  import { Task } from '@hcengineering/task'

  export let object: WithLookup<Task>
  export let width: string | undefined = undefined
  export let size: ButtonSize = 'medium'
  export let kind: ButtonKind = 'link'
  export let editable: boolean = true

  const client = getClient()
  $: shouldIgnoreOverdue = object.doneState !== null

  const handleDueDateChanged = async (newDueDate: number | undefined | null) => {
    if (newDueDate === undefined || object.dueDate === newDueDate) {
      return
    }

    await client.updateCollection(
      object._class,
      object.space,
      object._id,
      object.attachedTo,
      object.attachedToClass,
      object.collection,
      { dueDate: newDueDate }
    )
  }
</script>

{#if object}
  <DueDatePresenter
    {kind}
    {width}
    {size}
    value={object.dueDate}
    {editable}
    onChange={(e) => handleDueDateChanged(e)}
    {shouldIgnoreOverdue}
  />
{/if}
