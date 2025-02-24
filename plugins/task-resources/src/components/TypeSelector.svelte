<script lang="ts">
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Project, ProjectType } from '@hcengineering/task'
  import { DropdownLabels, resolvedLocationStore } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import { activeProjects, selectedTypeStore, selectedTaskTypeStore, taskTypeStore, typeStore } from '..'
  import TaskKindSelector from './taskTypes/TaskKindSelector.svelte'

  export let project: Ref<Project> | undefined = undefined
  export let baseClass: Ref<Class<Doc>>
  export let allTypes = false

  let typeFixed: boolean = false

  $: currentProject = project !== undefined ? $activeProjects.get(project) : undefined

  const client = getClient()

  $: availableProjectTypes = Array.from($typeStore.values()).filter((it) =>
    it.tasks.some((tit) => {
      const taskType = $taskTypeStore.get(tit)
      if (taskType !== undefined) {
        return client.getHierarchy().isDerived(taskType.ofClass, baseClass)
      }
      return false
    })
  )

  $: if (
    availableProjectTypes.length > 0 &&
    ($selectedTypeStore === undefined ||
      availableProjectTypes.find((it) => it._id === $selectedTypeStore) === undefined)
  ) {
    $selectedTypeStore = availableProjectTypes[0]._id
  }

  $: if ($resolvedLocationStore.query?.type !== undefined) {
    $selectedTypeStore = $resolvedLocationStore.query?.type as Ref<ProjectType>
  }

  $: if (currentProject?.type !== undefined) {
    $selectedTypeStore = currentProject?.type
    typeFixed = true
  } else {
    typeFixed = false
  }

  onDestroy(() => {
    selectedTypeStore.set(undefined)
  })
</script>

{#if !typeFixed}
  <DropdownLabels
    kind={'link'}
    size={'medium'}
    items={availableProjectTypes.map((it) => ({ id: it._id, label: it.name }))}
    bind:selected={$selectedTypeStore}
  />
{/if}
{#if !allTypes}
  <TaskKindSelector {baseClass} projectType={$selectedTypeStore} bind:value={$selectedTaskTypeStore} />
{/if}
