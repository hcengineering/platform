<script lang="ts">
  import { Class, Mixin, Ref, SortingOrder } from '@hcengineering/core'
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

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  interface MixinItem {
    id: string
    label: string
    targetClass: Ref<Mixin<Task>>
    parentMixin: Ref<Mixin<Task>> | undefined
  }

  let allTaskTypes: TaskType[] = []

  // Query all TaskTypes to get their names and targetClass mixins
  const taskTypeQuery = createQuery()
  $: {
    const compatibleClasses = hierarchy.getDescendants(baseClass)
    taskTypeQuery.query(
      task.class.TaskType,
      { ofClass: { $in: compatibleClasses } },
      (res) => {
        allTaskTypes = res
      },
      { sort: { name: SortingOrder.Ascending } }
    )
  }

  // Build hierarchical items from TaskTypes
  // Each TaskType has a targetClass mixin and optionally a baseMixin (parent)
  function buildItems (taskTypes: TaskType[]): MixinItem[] {
    const result: MixinItem[] = []

    // Create a map of targetClass -> TaskType for lookup
    const targetClassToTaskType = new Map<string, TaskType>()
    for (const tt of taskTypes) {
      targetClassToTaskType.set(tt.targetClass as string, tt)
    }

    // Find root TaskTypes (those without baseMixin or with baseMixin that's not another TaskType's targetClass)
    const rootTaskTypes = taskTypes.filter((tt) => {
      if (tt.baseMixin === undefined) return true
      return !targetClassToTaskType.has(tt.baseMixin as string)
    })

    // Add root items
    for (const tt of rootTaskTypes) {
      result.push({
        id: tt.targetClass as string,
        label: tt.name,
        targetClass: tt.targetClass,
        parentMixin: tt.baseMixin
      })

      // Find and add children (TaskTypes that have this targetClass as baseMixin)
      const children = taskTypes.filter((child) => child.baseMixin === tt.targetClass)
      for (const child of children) {
        result.push({
          id: child.targetClass as string,
          label: '  ' + child.name,
          targetClass: child.targetClass,
          parentMixin: child.baseMixin
        })

        // Add grandchildren
        const grandchildren = taskTypes.filter((gc) => gc.baseMixin === child.targetClass)
        for (const gc of grandchildren) {
          result.push({
            id: gc.targetClass as string,
            label: '    ' + gc.name,
            targetClass: gc.targetClass,
            parentMixin: gc.baseMixin
          })
        }
      }
    }

    return result
  }

  $: mixinItems = buildItems(allTaskTypes)

  // Build items for ButtonMenu
  $: items = [
    { id: '', label: 'None (create new)' },
    ...mixinItems.map((m) => ({
      id: m.id,
      label: m.label
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
