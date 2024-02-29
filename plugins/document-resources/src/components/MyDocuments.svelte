<script lang="ts">
  import { Employee, PersonAccount } from '@hcengineering/contact'
  import { Ref, getCurrentAccount } from '@hcengineering/core'
  import Documents from './Documents.svelte'

  const currentUser = (getCurrentAccount() as PersonAccount).person as Ref<Employee>
</script>

<Documents query={{ authors: currentUser }} />
