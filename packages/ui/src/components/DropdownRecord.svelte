<script lang="ts">
  import { IntlString } from '@anticrm/platform'
  import { createEventDispatcher } from 'svelte'
  import ui, { Label, Button, IconDownOutline, showPopup } from '..'
  import type { ButtonKind, ButtonSize } from '../types'
  import DropdownRecordPopup from './DropdownRecordPopup.svelte'

  export let items: Record<any, IntlString>
  export let selected: any | undefined = undefined

  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let width: string | undefined = '10rem'

  const dispatch = createEventDispatcher()

  let tool: HTMLElement
  let opened: boolean = false
  $: selectedLabel = selected ? items[selected] : ui.string.NotSelected
</script>

<div class="clear-mins" bind:this={tool}>
  <Button
    {kind}
    {size}
    {width}
    on:click={() => {
      if (!opened) {
        opened = true
        showPopup(DropdownRecordPopup, { items, selected }, tool, (result) => {
          if (result != null) {
            dispatch('select', result)
          }
          opened = false
        })
      }
    }}
  >
    <svelte:fragment slot="content">
      <div class="flex-between clear-mins pointer-events-none" style:width style:max-width={'12rem'}>
        <span class="overflow-label"><Label label={selectedLabel} /></span>
        <div class="ml-2"><IconDownOutline size={'small'} /></div>
      </div>
    </svelte:fragment>
  </Button>
</div>
