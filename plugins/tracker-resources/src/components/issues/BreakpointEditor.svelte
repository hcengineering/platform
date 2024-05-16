<script lang="ts">
  import { AttachedData } from '@hcengineering/core'

  import { getClient } from '@hcengineering/presentation'
  import { Issue, IssueDraft } from '@hcengineering/tracker'
  import { Button, ButtonKind, ButtonSize, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import { EditBoxPopup, FixedColumn } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import BreakpointPopup from './BreakpointPopup.svelte'
  import BreakpointStatsPresenter from './BreakpointStatsPresenter.svelte'
  import BreakpointPresenter from './BreakpointPresenter.svelte'

  export let value: Issue | AttachedData<Issue> | IssueDraft
  export let isEditable: boolean = true

  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = undefined
  export let focusIndex: number | undefined = undefined

  const client = getClient()
  const dispatch = createEventDispatcher()

  const handlebreakpointEditorOpened = (event: MouseEvent) => {
    event.stopPropagation()

    if (!isEditable) {
      return
    }

    if (kind === 'list') {
      showPopup(BreakpointPopup, { value: value.breakpoint, format: 'number', object: value }, 'top')
    } else {
      showPopup(EditBoxPopup, { value: value.breakpoint, format: 'number' }, eventToHTMLElement(event), (res) => {
        if (res !== undefined) {
          changeBreakpoint(res)
        }
      })
    }
  }

  const changeBreakpoint = async (newBreakpoint: number | undefined) => {
    if (!isEditable || newBreakpoint === undefined || value.breakpoint === newBreakpoint) {
      return
    }
    if (newBreakpoint < 0 || newBreakpoint > 5) {
      newBreakpoint = 0
    }
    if (newBreakpoint == null) {
      newBreakpoint = 0
    }

    dispatch('change', newBreakpoint)

    if ('_class' in value) {
      await client.update(value, { breakpoint: newBreakpoint })
    } else {
      value.breakpoint = newBreakpoint
    }
  }
</script>

{#if value}
  {#if kind === 'list' && '_class' in value}
    <FixedColumn key="breakpoint-editor-total">
      <BreakpointStatsPresenter {value} {kind} on:click={handlebreakpointEditorOpened} />
    </FixedColumn>
  {:else}
    <Button
      {focusIndex}
      showTooltip={isEditable ? { label: tracker.string.Breakpoint } : undefined}
      notSelected={value.breakpoint === 0}
      icon={tracker.icon.Breakpoint}
      {justify}
      {width}
      {size}
      {kind}
      disabled={!isEditable}
      on:click={handlebreakpointEditorOpened}
    >
      <BreakpointPresenter slot="content" value={value.breakpoint} />
    </Button>
  {/if}
{/if}
