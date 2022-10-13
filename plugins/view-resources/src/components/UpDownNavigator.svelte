<script lang="ts">
  import { Doc } from '@hcengineering/core'
  import {
    Button,
    IconNavPrev,
    IconDownOutline,
    IconUpOutline,
    panelstore,
    showPanel,
    closeTooltip
  } from '@hcengineering/ui'
  import { tick } from 'svelte'
  import { select } from '../actionImpl'
  import { focusStore } from '../selection'
  import tracker from '../../../tracker-resources/src/plugin'

  export let element: Doc
  export let parentIssue: Doc | undefined

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

  function openParentIssue () {
    if (parentIssue) {
      closeTooltip()
      showPanel(tracker.component.EditIssue, parentIssue._id, parentIssue._class, 'content')
    }
  }

  $: select(undefined, 0, element, 'vertical')
</script>

<Button icon={IconDownOutline} kind={'secondary'} size={'medium'} on:click={(evt) => next(evt, true)} />
<Button icon={IconUpOutline} kind={'secondary'} size={'medium'} on:click={(evt) => next(evt, false)} />

{#if parentIssue !== undefined}
  <Button
    showTooltip={{ label: tracker.string.OpenParent, direction: 'bottom' }}
    icon={IconNavPrev}
    kind={'secondary'}
    size={'medium'}
    on:click={openParentIssue}
  />
{/if}
