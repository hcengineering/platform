<script lang="ts">
  import { Doc } from '@anticrm/core'
  import { Button, IconDownOutline, IconUpOutline, panelstore, showPanel } from '@anticrm/ui'
  import { tick } from 'svelte'
  import { select } from '../actionImpl'
  import { focusStore } from '../selection'

  export let element: Doc

  async function next (evt: Event, pn: boolean): Promise<void> {
    select(evt, pn ? 1 : -1, element, 'vertical')
    await tick()
    if ($focusStore.focus !== undefined && $panelstore.panel !== undefined) {
      showPanel(
        $panelstore.panel.component,
        $focusStore.focus._id,
        $focusStore.focus._class,
        $panelstore.panel?.element ?? 'content',
        $panelstore.panel.rightSection
      )
    }
  }

  $: select(undefined, 0, element, 'vertical')
</script>

<Button icon={IconDownOutline} kind={'secondary'} size={'medium'} on:click={(evt) => next(evt, true)} />
<Button icon={IconUpOutline} kind={'secondary'} size={'medium'} on:click={(evt) => next(evt, false)} />
