<script lang="ts">
  import { AutomationSupport } from '@anticrm/automation'
  import { Class, Doc, Ref } from '@anticrm/core'
  import { Button, Dropdown, EditBox, IconAdd, IconDelete, Label, ListItem } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { createEventDispatcher } from 'svelte'
  import { Trigger } from '../models'
  import automation from '../plugin'

  export let automationSupport: AutomationSupport<Doc>
  export let trigger: Trigger | undefined = undefined
  export let _class: Ref<Class<Doc>>
  const dispatch = createEventDispatcher()

  let selectedActionMode: ListItem | undefined = undefined
  let name: string | undefined = undefined

  function addActionTrigger () {
    if (!name || !selectedActionMode) {
      return
    }
    trigger = {
      action: {
        context: selectedActionMode?._id,
        target: _class,
        label: name!
      }
    }
    dispatch('trigger', trigger)
  }

  function clearTrigger () {
    trigger = undefined
    dispatch('trigger', trigger)
  }
</script>

{#if trigger}
  <div class="flex">
    <div class="ac-header short divide">
      <Label label={automation.string.Trigger} />
    </div>
    <Button icon={IconDelete} kind="transparent" on:click={clearTrigger} />
  </div>
{:else}
  <div class="flex-col">
    <Label label={automation.string.AddTrigger} />
    {#if automationSupport?.trigger?.action}
      <div class="flex-between">
        <div class="flex flex-gap-1">
          <Label label={automation.string.AddMenu} />
          <div class="flex-col">
            <Label label={automation.string.MenuName} />
            <EditBox bind:value={name} />
          </div>
          <div class="flex flex-gap-1">
            <div class="flex-col">
              <Label label={automation.string.MenuMode} />
              <Dropdown
                items={automationSupport.trigger.action.mode.map((m) => ({ _id: m, isSelectable: true, label: m }))}
                bind:selected={selectedActionMode}
                placeholder={view.string.LabelNA}
              />
            </div>
          </div>
        </div>
        <Button icon={IconAdd} kind="transparent" disabled={!name || !selectedActionMode} on:click={addActionTrigger} />
      </div>
    {/if}
  </div>
{/if}
