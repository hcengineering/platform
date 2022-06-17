<script lang="ts">
  import { Class, Doc, Ref } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import { Label } from '@anticrm/ui'
  import automation from '../plugin'
  import AutomationActions from './AutomationActions.svelte'
  import AutomationTrigger from './AutomationTrigger.svelte'

  export let _class: Ref<Class<Doc>>
  const client = getClient()
  const hierarchy = client.getHierarchy()

  const classObject = hierarchy.getClass(_class)
  const mixin = hierarchy.as(classObject, automation.mixin.AutomationSupport)
</script>

{#if mixin}
  <div class="flex-col">
    <div class="ac-header short">
      <Label label={automation.string.Trigger} />
    </div>
    <AutomationTrigger automationSupport={mixin} {_class} />
    <div class="ac-header short">
      <Label label={automation.string.Actions} />
    </div>
    <AutomationActions automationSupport={mixin} {_class} />
  </div>
{/if}
