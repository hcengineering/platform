<script lang="ts">
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { TaskTypeKind } from '@hcengineering/task'
  import { ButtonKind, DropdownLabelsIntl, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  export let kind: TaskTypeKind
  export let readonly = false
  export let buttonKind: ButtonKind = 'regular'
  const dispatch = createEventDispatcher()
  const items = [
    {
      id: 'task',
      label: getEmbeddedLabel('Task')
    },
    {
      id: 'subtask',
      label: getEmbeddedLabel('Sub-task')
    },
    {
      id: 'both',
      label: getEmbeddedLabel('Task & Sub-task')
    }
  ]
  $: selected = items.find((it) => it.id === kind)
</script>

{#if readonly}
  {#if selected}
    <Label label={selected.label} />
  {/if}
{:else}
  <DropdownLabelsIntl
    selected={kind}
    {items}
    justify={'left'}
    size={'large'}
    kind={buttonKind}
    disabled={readonly}
    on:selected={(evt) => {
      if (evt.detail != null) {
        kind = evt.detail
        dispatch('change', kind)
      }
    }}
  />
{/if}
