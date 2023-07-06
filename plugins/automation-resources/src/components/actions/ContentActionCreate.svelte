<script lang="ts">
  import { CommandType, UpdateDocCommand } from '@hcengineering/automation'
  import core, { AnyAttribute, Class, Doc, Ref } from '@hcengineering/core'
  import ui, { Button, EditBox, IconAdd, Label } from '@hcengineering/ui'
  import { BooleanEditor, NumberEditor } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'

  import automation from '../../plugin'

  export let automationSupport: { name: string }
  export let attribute: AnyAttribute | undefined = undefined
  export let targetClass: Ref<Class<Doc>>

  const dispatch = createEventDispatcher()
  const typeClass = attribute?.type._class

  let value: string | undefined = undefined

  function onChange (v: any) {
    value = v
  }

  function add () {
    if (attribute && value !== undefined) {
      const command: UpdateDocCommand<any> = {
        type: CommandType.UpdateDoc,
        targetClass,
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
    <div class="flex flex-gap-1 mr-3 items-center">
      <Label label={automation.string.Set} />
      <span class="font-semi-bold">
        <Label label={attribute.label} />
      </span>
      <Label label={automation.string.To} />
      <div>
        {#if typeClass === core.class.TypeString || typeClass === core.class.TypeMarkup}
          <EditBox bind:value />
        {:else if typeClass === core.class.TypeNumber}
          <NumberEditor value={Number(value)} {onChange} autoFocus placeholder={ui.string.EditBoxPlaceholder} />
        {:else if typeClass === core.class.TypeBoolean}
          <BooleanEditor {value} {onChange} />
        {/if}
      </div>
    </div>
    <Button icon={IconAdd} kind="ghost" on:click={add} />
  </div>
{/if}
