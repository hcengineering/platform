<script lang="ts">
  import core, { AnyAttribute } from '@anticrm/core'
  import { Button, Dropdown, EditBox, IconAdd, Label, ListItem } from '@anticrm/ui'
  import view from '@anticrm/view'
  import automation from '../../plugin'

  export let automationSupport: { name: string }
  export let attribute: AnyAttribute | undefined = undefined

  const typeClass = attribute?.type._class
  const selectedBooleanValue: ListItem | undefined = undefined
  const booleanListItems: ListItem[] = [
    {
      _id: 'true',
      label: 'true',
      isSelectable: true
    },
    {
      _id: 'false',
      label: 'false',
      isSelectable: true
    }
  ]
  let value
</script>

{#if attribute && automationSupport}
  <div class="flex-between">
    <div class="flex flex-gap-1 mr-3">
      <Label label={automation.string.Set} />
      <span class="font-semi-bold">
        <Label label={attribute.label} />
      </span>
      <Label label={automation.string.To} />
      <div>
        {#if typeClass === core.class.TypeString || typeClass === core.class.TypeMarkup}
          <EditBox on:change />
        {:else if typeClass === core.class.TypeNumber}
          <EditBox format="number" on:change />
        {:else if typeClass === core.class.TypeBoolean}
          <Dropdown items={booleanListItems} selected={selectedBooleanValue} placeholder={view.string.LabelNA} />
        {/if}
      </div>
    </div>
    <Button icon={IconAdd} kind="transparent" />
  </div>
{/if}
