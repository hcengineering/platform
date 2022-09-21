<script lang="ts">
  import { getClient } from '@hcengineering/presentation'
  import { Icon, Label } from '@hcengineering/ui'
  import { ClassPresenter } from '@hcengineering/view-resources'
  import { Trigger } from '../../models'
  import automation from '../../plugin'

  export let value: Trigger

  const client = getClient()
  const hierarchy = client.getHierarchy()
</script>

{#if value.action}
  {@const targetClass = hierarchy.getClass(value.action.target)}
  <div class="flex flex-gap-1 items-center">
    <span class="mr-4">
      <Label label={automation.string.Menu} />
    </span>
    {#if value.action.icon}
      <Icon icon={value.action.icon} size="small" />
    {/if}
    <span class="mr-2">{value.action.label}</span>
    <Label label={automation.string.In} />
    <span class="font-semi-bold">
      <ClassPresenter value={targetClass} />
    </span>
  </div>
{/if}
