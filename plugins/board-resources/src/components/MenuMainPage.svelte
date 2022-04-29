<script lang="ts">
  import { Button } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import board from '@anticrm/board'
  import plugin from '../plugin'

  const dispatch = createEventDispatcher()
</script>

<div class="p-4">
  <Button
    label={plugin.string.Archive}
    width={'100%'}
    on:click={() => {
      dispatch('change', board.menuPageId.Archive)
    }}
  />
</div>
