<script lang="ts">
  import { Button, Component } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import activity from '@anticrm/activity'
  import board from '@anticrm/board'
  import plugin from '../plugin'
  import { createQuery } from '@anticrm/presentation'
  import core, { Ref, Space } from '@anticrm/core'

  export let space: Ref<Space>

  let object: Space

  const dispatch = createEventDispatcher()
  const query = createQuery()
  $: query.query(core.class.Space, { _id: space }, (result) => {
    ;[object] = result
  })
</script>

<div class="p-4">
  <Button
    label={plugin.string.Archive}
    width={'100%'}
    on:click={() => {
      dispatch('change', board.menuPageId.Archive)
    }}
  />
  {#if object}
    <Component is={activity.component.Activity} props={{ object, showCommenInput: false, transparent: true }} />
  {/if}
</div>
