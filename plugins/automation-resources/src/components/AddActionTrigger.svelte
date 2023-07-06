<script lang="ts">
  import { AutomationSupport } from '@hcengineering/automation'
  import core, { Class, Doc, Ref } from '@hcengineering/core'
  import { Asset } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Button, Dropdown, EditBox, eventToHTMLElement, IconAdd, Label, ListItem, showPopup } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import { Trigger } from '../models'
  import automation from '../plugin'
  import ClassSelector from './selectors/ClassSelector.svelte'
  import IconChooser from './selectors/IconChooser.svelte'

  export let trigger: Trigger | undefined = undefined
  let targetClass: Ref<Class<Doc>>
  let automationSupport: AutomationSupport<Doc>
  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let selectedActionMode: ListItem | undefined = undefined
  let name: string | undefined = undefined
  let icon: Asset | undefined = undefined

  function addActionTrigger () {
    if (!name || !selectedActionMode) {
      return
    }
    trigger = {
      action: {
        context: selectedActionMode?._id as 'editor' | 'context',
        target: targetClass,
        label: name!,
        icon
      }
    }
    dispatch('targetClass', targetClass)
    dispatch('trigger', trigger)
  }

  function chooseIcon (ev: MouseEvent) {
    showPopup(IconChooser, { icon }, eventToHTMLElement(ev), (result) => {
      if (result !== undefined && result !== null) {
        icon = result
      }
    })
  }

  const classes = hierarchy
    .getDescendants(core.class.Doc)
    .map((p) => hierarchy.getClass(p))
    .filter((p) => {
      if (!hierarchy.hasMixin(p, automation.mixin.AutomationSupport)) {
        return false
      }
      const support = hierarchy.as(p, automation.mixin.AutomationSupport)
      return !!support.trigger.action
    })
  $: if (targetClass) {
    automationSupport = hierarchy.as(hierarchy.getClass(targetClass), automation.mixin.AutomationSupport)
  }
</script>

<div class="flex-col">
  <Label label={automation.string.AddMenu} />
  <div class="flex flex-gap-2 mt-2 mb-2 items-center">
    <Label label={automation.string.SelectClass} />
    <ClassSelector
      {classes}
      on:selected={(e) => {
        targetClass = e.detail
      }}
    />
  </div>
  {#if automationSupport?.trigger?.action}
    <div class="flex-between">
      <div class="flex flex-gap-3 mb-2">
        <div class="flex-col items-baseline justify-center flex-gap-2">
          <Label label={automation.string.Icon} />
          <Button icon={icon ?? IconAdd} kind="no-border" size="medium" on:click={chooseIcon} />
        </div>
        <div class="flex-col items-baseline justify-center flex-gap-2">
          <Label label={core.string.Name} />
          <div class="h-7">
            <EditBox bind:value={name} />
          </div>
        </div>
        <div class="flex-col items-baseline justify-center flex-gap-2">
          <Label label={automation.string.Mode} />
          <Dropdown
            items={automationSupport.trigger.action.mode.map((m) => ({ _id: m, isSelectable: true, label: m }))}
            bind:selected={selectedActionMode}
            placeholder={view.string.LabelNA}
            size="medium"
          />
        </div>
      </div>
      <Button icon={IconAdd} kind="ghost" disabled={!name || !selectedActionMode} on:click={addActionTrigger} />
    </div>
  {/if}
</div>
