<script lang="ts">
  import { Class, Doc, Ref, toIdMap } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import task, { ProjectType, TaskType } from '@hcengineering/task'
  import { DropdownLabels } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import { selectedTaskTypeStore, taskTypeStore } from '../..'

  export let projectType: Ref<ProjectType> | undefined
  export let taskType: Ref<TaskType> | undefined
  export let focusIndex: number = -1
  export let baseClass: Ref<Class<Doc>> | undefined = undefined
  export let allTypes = false
  const client = getClient()

  $: taskTypeDescriptors = toIdMap(client.getModel().findAllSync(task.class.TaskTypeDescriptor, {}))

  $: items = Array.from($taskTypeStore.values())
    .filter(
      (it) =>
        it.parent === projectType &&
        (taskTypeDescriptors.get(it.descriptor)?.allowCreate ?? false) &&
        (baseClass === undefined || client.getHierarchy().isDerived(it.targetClass, baseClass))
    )
    .map((it) => ({ id: it._id, label: it.name }))

  $: if (
    (taskType === undefined && items.length > 0) ||
    (items.length > 0 && items.find((it) => it.id === taskType) === undefined)
  ) {
    taskType = items[0].id
  }

  onDestroy(() => {
    $selectedTaskTypeStore = undefined
  })
</script>

{#if projectType !== undefined && items.length > 1}
  <div class="p-1">
    <DropdownLabels {focusIndex} kind={'regular'} {items} bind:selected={taskType} enableSearch={false} />
  </div>
{/if}
