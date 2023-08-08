<script lang="ts">
  import { Doc } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Button, IconDownOutline, IconUpOutline, navigate } from '@hcengineering/ui'
  import { tick } from 'svelte'
  import { select } from '../actionImpl'
  import view from '../plugin'
  import { focusStore } from '../selection'
  import { getObjectLinkFragment } from '../utils'

  export let element: Doc

  const client = getClient()

  async function next (evt: Event, pn: boolean): Promise<void> {
    select(evt, pn ? 1 : -1, element, 'vertical')
    await tick()
    if ($focusStore.focus !== undefined) {
      const doc = await client.findOne($focusStore.focus._class, { _id: $focusStore.focus._id })
      if (doc !== undefined) {
        const component = client.getHierarchy().classHierarchyMixin(doc._class, view.mixin.ObjectPanel)
        const link = await getObjectLinkFragment(
          client.getHierarchy(),
          doc,
          {},
          component?.component ?? view.component.EditDoc
        )
        navigate(link)
      }
    }
  }

  $: select(undefined, 0, element, 'vertical', true)
</script>

{#if $focusStore.focus !== undefined && $focusStore.provider !== undefined}
  <Button
    focusIndex={10005}
    icon={IconDownOutline}
    kind={'regular'}
    size={'medium'}
    on:click={(evt) => next(evt, true)}
  />
  <Button
    focusIndex={10006}
    icon={IconUpOutline}
    kind={'regular'}
    size={'medium'}
    on:click={(evt) => next(evt, false)}
  />
{/if}
