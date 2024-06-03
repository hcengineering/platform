<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import type { Training } from '@hcengineering/training'
  import { getClient } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'

  export let value: Training

  const label = getClient().getHierarchy().getAttribute(value._class, 'revision').label
</script>

<span>
  <Label {label} />
  {value.revision}
</span>
