<script lang="ts">
  import ui, { Button, Icon, IconAdd, IconBack, Label } from '@hcengineering/ui'
  import automation from '../plugin'
  import AddAutomation from './AddAutomation.svelte'
  import Automations from './Automations.svelte'

  let isAdding = false
</script>

<div class="antiPanel-component">
  <div class="ac-header full withSettings short divide">
    <div class="ac-header__wrap-title">
      <div class="ac-header__icon"><Icon icon={automation.icon.Automation} size="small" /></div>
      <span class="ac-header__title"><Label label={automation.string.Automation} /></span>
    </div>
    <Button
      icon={isAdding ? IconBack : IconAdd}
      label={isAdding ? ui.string.Cancel : automation.string.Automation}
      kind={isAdding ? 'no-border' : 'accented'}
      on:click={() => {
        isAdding = !isAdding
      }}
    />
  </div>
  {#if isAdding}
    <div class="ac-body columns hScroll">
      <AddAutomation
        on:close={() => {
          isAdding = false
        }}
      />
    </div>
  {:else}
    <Automations />
  {/if}
</div>
