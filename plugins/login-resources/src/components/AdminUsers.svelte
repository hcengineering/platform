<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { isAdminUser } from '@hcengineering/presentation'

  if (typeof window !== 'undefined' && !isAdminUser()) {
    window.location.href = '/login'
  }
</script>

<div class="admin-users-page">
  <h1>Admin: Users</h1>
  <p>Coming soon — full user-management UI under construction.</p>
</div>

<style lang="scss">
  .admin-users-page {
    padding: 2rem;
  }
</style>
