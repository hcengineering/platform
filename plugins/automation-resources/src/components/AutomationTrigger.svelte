<script lang="ts">
  import { AutomationSupport } from '@anticrm/automation'
  import { Class, Doc, Ref } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import { Button, Dropdown, EditBox, IconAdd, Label, ListItem } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { Trigger } from '../models'
  import automation from '../plugin'

  export let automationSupport: AutomationSupport<Doc>
  export let trigger: Trigger | undefined = undefined
  export let _class: Ref<Class<Doc>>
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let selectedActionMode: ListItem | undefined = undefined
</script>

{#if trigger}
  <div class="flex">
    <div class="ac-header short divide">
      <Label label={automation.string.Trigger} />
    </div>
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
          <EditBox />
        </div>
        <div class="flex flex-gap-1">
          <Label label={automation.string.AddMenu} />
          <div class="flex-col">
          <Label label={automation.string.MenuName} />
          <EditBox />
        </div>
        <div class="flex-col">
          <Label label={automation.string.MenuMode} />
          <Dropdown
            items={automationSupport.trigger.action.mode.map((m) => ({ _id: m, isSelectable: true, label: m }))}
            bind:selected={selectedActionMode}
            placeholder={view.string.LabelNA}
          />
          </div>
        </div>
        <Button icon={IconAdd} kind="transparent" />
      </div>
    {/if}
  </div>
{/if}
