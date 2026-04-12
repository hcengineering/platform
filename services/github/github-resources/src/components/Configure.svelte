<script lang="ts">
  import type { Integration as AccountIntegration } from '@hcengineering/account-client'
  import Connect from './Connect.svelte'

  export let integration: AccountIntegration | undefined
</script>

<Connect bind:integration on:close />
