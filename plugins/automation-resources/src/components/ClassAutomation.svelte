<script lang="ts">
  import { Command } from '@anticrm/automation'
  import { Class, Doc, Ref } from '@anticrm/core'
  import presentation, { getClient } from '@anticrm/presentation'
  import { Button, Label } from '@anticrm/ui'
  import { Trigger } from '../models'
  import automation from '../plugin'
  import AutomationActions from './AutomationActions.svelte'
  import AutomationTrigger from './AutomationTrigger.svelte'

  export let _class: Ref<Class<Doc>>
  export let trigger: Trigger | undefined = undefined
  export let commands: Command[] = []
  const client = getClient()
  const hierarchy = client.getHierarchy()

  const classObject = hierarchy.getClass(_class)
  const mixin = hierarchy.as(classObject, automation.mixin.AutomationSupport)

  function save () {
    console.log(commands)
    console.log(trigger)
  }
</script>

{#if mixin}
  <div class="flex-col">
    <div class="ac-header short">
      <Label label={automation.string.Trigger} />
    </div>
    <AutomationTrigger
      automationSupport={mixin}
      {_class}
      {trigger}
      on:trigger={(e) => {
        trigger = e.detail
      }}
    />
    <div class="ac-header short">
      <Label label={automation.string.Actions} />
    </div>
    <AutomationActions automationSupport={mixin} {_class} bind:commands />
    <Button label={presentation.string.Save} disabled={!trigger || !commands.length} on:click={save} />
  </div>
{/if}
