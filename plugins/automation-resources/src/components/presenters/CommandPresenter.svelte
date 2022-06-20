<script lang="ts">
  import { Doc } from '@anticrm/core'
  import { Command, isUpdateDocCommand } from '@anticrm/automation'
  import { getClient } from '@anticrm/presentation'
  import { Label } from '@anticrm/ui'
  import { ClassPresenter } from '@anticrm/view-resources'

  import automation from '../../plugin'

  export let value: Command<Doc>

  const client = getClient()
  const hierarchy = client.getHierarchy()
</script>

{#if isUpdateDocCommand(value)}
  {@const targetClass = hierarchy.getClass(value.targetClass)}
  {#each Object.keys(value.update) as attr}
    {@const attribute = hierarchy.getAttribute(value.targetClass, attr)}
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
      <span>{value.update?.[attr]}</span>
    </div>
  {/each}
{/if}
