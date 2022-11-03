<script lang="ts">
  import { EmployeeAccount } from '@hcengineering/contact'
  import { getCurrentAccount } from '@hcengineering/core'
  import Documents from './Documents.svelte'

  const currentUser = getCurrentAccount() as EmployeeAccount
</script>

<Documents query={{ authors: currentUser.employee }} />
