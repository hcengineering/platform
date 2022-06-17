<script lang="ts">
  import { AutomationSupport } from '@anticrm/automation'
  import { Class, Doc, Ref } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import { Label } from '@anticrm/ui'
  import automation from '../plugin'

  export let automationSupport: AutomationSupport<Doc>
  export let trigger: undefined = undefined
  export let _class: Ref<Class<Doc>>
  const client = getClient()
  const hierarchy = client.getHierarchy()
</script>

<div class="flex">
  <div class="ac-header short divide">
    <Label label={automation.string.Trigger} />
  </div>
</div>
