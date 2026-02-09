<script lang="ts">
  import { Class, Mixin, Ref } from '@hcengineering/core'
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

  // Find all mixins that derive from baseClass
  function getAvailableMixins (): Array<{ id: string; label: string }> {
    const result: Array<{ id: string; label: string }> = [
      { id: '', label: 'None (create new)' }
    ]

    try {
      const descendants = hierarchy.getDescendants(baseClass)
      for (const descendant of descendants) {
        const cls = hierarchy.getClass(descendant)
        if (cls.kind === 'mixin' && descendant !== baseClass) {
          result.push({
            id: descendant as string,
            label: cls.label ?? descendant
          })
        }
      }
    } catch (e) {
      console.error('Error getting available mixins:', e)
    }

    return result
  }

  function handleSelect (evt: CustomEvent<string>): void {
    if (evt.detail !== undefined) {
      value = evt.detail === '' ? undefined : (evt.detail as Ref<Mixin<Task>>)
      dispatch('change', value)
    }
  }

  $: items = getAvailableMixins()
  $: selected = items.find((it) => it.id === (value ?? ''))
</script>

<div class="mixin-selector">
  <Label label={plugin.string.BaseMixin} />
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
</style>
