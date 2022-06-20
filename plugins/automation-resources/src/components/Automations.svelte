<script lang="ts">
  import automation from '@anticrm/automation'
  import { TableBrowser } from '@anticrm/view-resources'
</script>

<TableBrowser _class={automation.class.Automation} config={['name', 'description', 'modifiedOn']} query={{}} />
