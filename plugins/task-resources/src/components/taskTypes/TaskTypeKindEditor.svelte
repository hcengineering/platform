<script lang="ts">
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { TaskTypeKind } from '@hcengineering/task'
  import { Label, ButtonMenu } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import IconLayers from '../icons/Layers.svelte'
  import IconLayerTop from '../icons/LayerTop.svelte'
  import IconLayerBottom from '../icons/LayerBottom.svelte'
  import plugin from '../../plugin'

  export let kind: TaskTypeKind
  export let readonly = false
  export let buttonKind: 'primary' | 'secondary' | 'tertiary' | 'negative' = 'secondary'
  export let buttonSize: 'large' | 'medium' | 'small' = 'large'

  const dispatch = createEventDispatcher()
  const items = [
    {
      id: 'both',
      icon: IconLayers,
      label: plugin.string.TaskAndSubTask,
      description: plugin.string.TaskAndSubTaskDescription
    },
    {
      id: 'task',
      icon: IconLayerTop,
      label: plugin.string.Task
    },
    {
      id: 'subtask',
      icon: IconLayerBottom,
      label: plugin.string.SubTask
    }
  ]
  $: selected = items.find((it) => it.id === kind)
</script>

{#if readonly}
  {#if selected}
    <Label label={selected.label} />
  {/if}
{:else}
  <ButtonMenu
    selected={kind}
    {items}
    icon={selected?.icon}
    label={selected?.label}
    kind={buttonKind}
    size={buttonSize}
    on:selected={(evt) => {
      if (evt.detail != null) {
        kind = evt.detail
        dispatch('change', kind)
      }
    }}
  />
{/if}
