<script lang="ts">
  import { Doc } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import ui, {
    Button,
    closeTooltip,
    getCurrentLocation,
    IconDownOutline,
    IconNavPrev,
    IconUpOutline,
    navigate,
    panelstore
  } from '@hcengineering/ui'
  import { tick } from 'svelte'
  import { select } from '../actionImpl'
  import { focusStore } from '../selection'
  import { getObjectLinkFragment } from '../utils'

  export let element: Doc

  const client = getClient()

  async function next (evt: Event, pn: boolean): Promise<void> {
    select(evt, pn ? 1 : -1, element, 'vertical')
    await tick()
    if ($focusStore.focus !== undefined && $panelstore.panel !== undefined) {
      const doc = await client.findOne($focusStore.focus._class, { _id: $focusStore.focus._id })
      if (doc !== undefined) {
        const link = await getObjectLinkFragment(client.getHierarchy(), doc, {}, $panelstore.panel.component)
        const location = getCurrentLocation()
        if (location.fragment !== link) {
          location.fragment = link
          navigate(location)
        }
      }
    }
  }

  function goBack () {
    closeTooltip()
    history.back()
  }

  $: select(undefined, 0, element, 'vertical')
</script>

<Button icon={IconDownOutline} kind={'secondary'} size={'medium'} on:click={(evt) => next(evt, true)} />
<Button icon={IconUpOutline} kind={'secondary'} size={'medium'} on:click={(evt) => next(evt, false)} />
<Button
  showTooltip={{ label: ui.string.Back, direction: 'bottom' }}
  icon={IconNavPrev}
  kind={'secondary'}
  size={'medium'}
  on:click={goBack}
/>
