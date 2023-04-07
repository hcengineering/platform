<script lang="ts">
  import { Metadata } from '@hcengineering/platform'
  import presentation, { Card } from '@hcengineering/presentation'
  import { Button } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import { createEventDispatcher } from 'svelte'

  export let icon: Metadata<string> | undefined = undefined

  const dispatch = createEventDispatcher()
  const icons = [tracker.icon.Home, tracker.icon.RedCircle]

  function save () {
    dispatch('close', icon)
  }
</script>

<Card
  label={tracker.string.ChooseIcon}
  okLabel={presentation.string.Save}
  okAction={save}
  canSave={icon !== undefined}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <div class="float-left-box">
    {#each icons as obj}
      <div class="float-left p-2">
        <Button
          icon={obj}
          size="medium"
          kind={obj === icon ? 'primary' : 'transparent'}
          on:click={() => {
            icon = obj
          }}
        />
      </div>
    {/each}
  </div>
</Card>
