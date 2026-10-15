<script lang="ts">
  import { Class, Mixin, Ref } from '@hcengineering/core'
  import task, { Task, TaskType } from '@hcengineering/task'
  import { ButtonMenu, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import plugin from '../../plugin'

  export let baseClass: Ref<Class<Task>>
  export let value: Ref<Mixin<Task>> | undefined = undefined
  export let readonly = false
  export let buttonKind: 'primary' | 'secondary' | 'tertiary' | 'negative' = 'secondary'
  export let buttonSize: 'large' | 'medium' | 'small' = 'large'
  export let excludeTaskType: Ref<TaskType> | undefined = undefined

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let availableTaskTypes: TaskType[] = []

  // Query all TaskTypes that have a compatible ofClass
  const taskTypeQuery = createQuery()
  $: {
    // Get all classes derived from baseClass to find compatible TaskTypes
    const compatibleClasses = hierarchy.getDescendants(baseClass)

    taskTypeQuery.query(
      task.class.TaskType,
      { ofClass: { $in: compatibleClasses } },
      (res) => {
        // Filter out the current TaskType if editing
        availableTaskTypes = excludeTaskType !== undefined
          ? res.filter((tt: TaskType) => tt._id !== excludeTaskType)
          : res
      }
    )
  }

  // Build items list from TaskTypes
  $: items = [
    { id: '', label: 'None (create new)' },
    ...availableTaskTypes.map((tt) => ({
      id: tt.targetClass as string,
      label: tt.name
    }))
  ]

  $: selected = items.find((it) => it.id === (value ?? ''))

  function handleSelect (evt: CustomEvent<string>): void {
    if (evt.detail !== undefined) {
      value = evt.detail === '' ? undefined : (evt.detail as Ref<Mixin<Task>>)
      dispatch('change', value)
    }
  }
</script>

<div class="mixin-selector">
  <span class="label">
    <Label label={plugin.string.BaseMixin} />
  </span>
  {#if readonly}
    {#if selected}
      <span class="selected-value">{selected.label}</span>
    {/if}
  {:else}
    <ButtonMenu
      selected={value ?? ''}
      {items}
      label={selected?.label ?? plugin.string.NoBaseMixin}
      kind={buttonKind}
      size={buttonSize}
      on:selected={handleSelect}
    />
  {/if}
</div>

<style lang="scss">
  .mixin-selector {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .selected-value {
    color: var(--theme-content-color);
  }

  .label {
    color: var(--theme-halfcontent-color);
  }
</style>
