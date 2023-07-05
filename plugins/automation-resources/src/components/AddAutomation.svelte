<script lang="ts">
  import { Command } from '@hcengineering/automation'
  import core, { Class, Doc, Ref } from '@hcengineering/core'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { Button, EditBox, Label } from '@hcengineering/ui'

  import { Trigger } from '../models'

  import { createAutomation } from '../utils'
  import AutomationActions from './AutomationActions.svelte'
  import AutomationTrigger from './AutomationTrigger.svelte'

  export let trigger: Trigger | undefined = undefined
  export let commands: Command<Doc>[] = []
  const client = getClient()

  let targetClass: Ref<Class<Doc>> | undefined = undefined
  let name: string | undefined = undefined
  let description: string | undefined = undefined

  function save () {
    if (!name || !trigger || !commands.length) {
      return
    }
    createAutomation(client, name, trigger, commands, { description, targetClass })
  }
</script>

<div class="flex-col p-4 w-full">
  <div class="flex flex-gap-2 mb-2">
    <Label label={core.string.Name} />
    <EditBox bind:value={name} />
  </div>
  <div class="flex flex-gap-2 mb-4">
    <Label label={core.string.Description} />
    <EditBox bind:value={description} />
  </div>
  <div class="mb-2">
    <AutomationTrigger
      {trigger}
      on:trigger={(e) => {
        trigger = e.detail
      }}
      on:targetClass={(e) => {
        targetClass = e.detail
      }}
    />
  </div>
  {#if trigger}
    <div class="mb-2">
      <AutomationActions {targetClass} bind:commands />
    </div>
  {/if}

  <Button
    label={presentation.string.Save}
    disabled={!name || !trigger || !commands.length}
    kind="accented"
    on:click={save}
  />
</div>
