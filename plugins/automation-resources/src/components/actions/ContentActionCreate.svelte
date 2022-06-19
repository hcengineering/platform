<script lang="ts">
  import { CommandType, UpdateDocCommand } from '@anticrm/automation'
  import core, { AnyAttribute, Class, Doc, Ref } from '@anticrm/core'
  import { Button, Dropdown, EditBox, IconAdd, Label, ListItem } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { createEventDispatcher } from 'svelte'

  import automation from '../../plugin'

  export let automationSupport: { name: string }
  export let attribute: AnyAttribute | undefined = undefined
  export let _class: Ref<Class<Doc>>

  const dispatch = createEventDispatcher()
  const typeClass = attribute?.type._class
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
  const selectedBooleanValue: ListItem | undefined = undefined
  let numValue: number | undefined = undefined
  let stringValue: string | undefined = undefined

  function add () {
    let value = undefined
    if (selectedBooleanValue) {
      value = selectedBooleanValue._id === 'true'
    } else if (stringValue) {
      value = stringValue
    } else if (numValue !== undefined) {
      value = Number(numValue)
    }

    if (attribute && value !== undefined) {
      const command: UpdateDocCommand<any> = {
        type: CommandType.UpdateDoc,
        targetClass: _class,
        update: {
          [attribute.name]: value
        }
      }
      dispatch('add', command)
    }
  }
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
          <EditBox bind:value={stringValue} on:change />
        {:else if typeClass === core.class.TypeNumber}
          <EditBox bind:value={numValue} format="number" on:change />
        {:else if typeClass === core.class.TypeBoolean}
          <Dropdown items={booleanListItems} selected={selectedBooleanValue} placeholder={view.string.LabelNA} />
        {/if}
      </div>
    </div>
    <Button icon={IconAdd} kind="transparent" on:click={add} />
  </div>
{/if}
