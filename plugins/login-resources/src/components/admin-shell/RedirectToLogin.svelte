<!--
// Copyright © 2026 Hardcore Engineering Inc.
// Renders nothing; navigates to /login on mount. Used by AdminShell as
// the non-admin branch of the admin-gate so the admin slot never mounts.
-->
<script lang="ts">
  import { onMount } from 'svelte'
  import { navigate } from '@hcengineering/ui'

  onMount(() => {
    navigate({ path: ['login'] })
  })
</script>
