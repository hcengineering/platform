<script lang="ts">
  import { Class, ClassifierKind, Doc, Mixin, Ref } from '@hcengineering/core'
  import { Task } from '@hcengineering/task'
  import { ButtonMenu, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { getClient } from '@hcengineering/presentation'
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
    level: number
    _class: Ref<Class<Doc>>
  }

  function buildMixinHierarchy (rootClass: Ref<Class<Doc>>, level: number = 0): MixinItem[] {
    const result: MixinItem[] = []
    const descendants = hierarchy.getDescendants(rootClass)

    for (const desc of descendants) {
      try {
        const cls = hierarchy.getClass(desc)
        // Only include direct children (extends === rootClass) and mixins
        if (cls.extends === rootClass && cls.kind === ClassifierKind.MIXIN && cls.label !== undefined) {
          // Get the label string
          let labelStr = ''
          try {
            const labelValue = client.getModel().findAllSync(cls._class, { _id: cls._id })[0]
            labelStr = (labelValue as any)?.label ?? cls._id.split(':').pop() ?? cls._id
          } catch {
            labelStr = cls._id.split(':').pop() ?? cls._id
          }

          result.push({
            id: cls._id,
            label: '  '.repeat(level) + labelStr,
            level,
            _class: cls._id
          })

          // Recursively add children
          const children = buildMixinHierarchy(cls._id, level + 1)
          result.push(...children)
        }
      } catch {
        // Skip invalid classes
      }
    }

    return result
  }

  // Build the hierarchical list of mixins
  $: mixinItems = buildMixinHierarchy(baseClass)

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
