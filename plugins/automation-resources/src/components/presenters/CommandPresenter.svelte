<script lang="ts">
  import { Doc } from '@hcengineering/core'
  import { Command, isUpdateDocCommand, UpdateDocCommand } from '@hcengineering/automation'
  import { getClient } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import { ClassPresenter } from '@hcengineering/view-resources'

  import automation from '../../plugin'

  export let value: Command<Doc>

  const client = getClient()
  const hierarchy = client.getHierarchy()
  function toUpdateDocCommand (command: Command<Doc>): UpdateDocCommand<Doc> {
    return command as UpdateDocCommand<Doc>
  }
  function toObjectValue (obj: any, attr: any): string {
    if (!obj || !attr) {
      return ''
    }
    return obj[attr]?.toString()
  }
</script>

{#if isUpdateDocCommand(value)}
  {@const updateCommand = toUpdateDocCommand(value)}
  {@const targetClass = hierarchy.getClass(updateCommand.targetClass)}
  {#each Object.keys(updateCommand.update) as attr}
    {@const attribute = hierarchy.getAttribute(updateCommand.targetClass, attr)}
    <div class="flex flex-gap-1 items-center">
      <Label label={automation.string.Update} />
      <span class="font-semi-bold">
        <ClassPresenter value={targetClass} />
      </span>
      <Label label={automation.string.Set} />
      <span class="font-semi-bold">
        <Label label={attribute.label} />
      </span>
      <Label label={automation.string.To} />
      <span>{toObjectValue(updateCommand.update, attr)}</span>
    </div>
  {/each}
{/if}
