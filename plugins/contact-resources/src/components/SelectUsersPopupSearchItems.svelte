<script lang="ts">
  import type { Employee } from '@hcengineering/contact'
  import type { Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { createEventDispatcher } from 'svelte'
  import { SearchPickerItem } from '@hcengineering/ui'
  import { getName } from '@hcengineering/contact'

  import contact from '../plugin'

  export let selectedIds: Ref<Employee>[] = []

  const dispatch = createEventDispatcher()
  const query = createQuery()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let selectedPersons: Employee[] = []

  $: query.query(
    contact.mixin.Employee,
    { _id: { $in: selectedIds } },
    result => {
      selectedPersons = result
    }
  )
</script>

{#each selectedPersons as person}
  <SearchPickerItem on:click={() => dispatch('remove', person._id)}>
    {getName(hierarchy, person)}
  </SearchPickerItem>
{/each}
