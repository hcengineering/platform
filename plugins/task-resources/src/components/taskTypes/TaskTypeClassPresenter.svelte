<script lang="ts">
  import { Class } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Task } from '@hcengineering/task'
  import task from '../../plugin'
  import { typeStore } from '../..'

  export let value: Class<Task>
  const client = getClient()

  $: asValue = client.getHierarchy().hasMixin(value, task.mixin.TaskTypeClass)
    ? client.getHierarchy().as(value, task.mixin.TaskTypeClass)
    : undefined

  $: typeName = asValue !== undefined ? $typeStore.get(asValue.projectType) : undefined
</script>

{#if typeName}
  ({typeName.name})
{/if}
