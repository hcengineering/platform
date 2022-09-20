<script lang="ts">
  import automation from '@hcengineering/automation'
  import { TableBrowser } from '@hcengineering/view-resources'
</script>

<TableBrowser _class={automation.class.Automation} config={['name', 'description', 'modifiedOn']} query={{}} />
