<script lang="ts">
  import { Label } from '@anticrm/ui'
  import { Trigger } from '../../models'
  import automation from '../../plugin'

  export let value: Trigger
</script>

{#if value.action}
  <div class="flex flex-gap-1">
    <Label label={automation.string.Menu} />
    <span>{value.action.label}</span>
  </div>
{/if}
