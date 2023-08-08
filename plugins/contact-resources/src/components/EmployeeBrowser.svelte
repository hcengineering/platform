<script lang="ts">
  import contact, { Employee } from '@hcengineering/contact'
  import { DocumentQuery, SortingOrder } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Scroller } from '@hcengineering/ui'
  import EmployeePresenter from './EmployeePresenter.svelte'

  export let search: string = ''
  const client = getClient()
  export let withHeader: boolean = true
  $: searchQuery = search.length ? { $search: search } : {}
  $: resultQuery = { ...searchQuery }
  let employees: Employee[] = []

  async function updateEmployees (resultQuery: DocumentQuery<Employee>) {
    employees = await client.findAll(
      contact.mixin.Employee,
      {
        ...resultQuery
      },
      {
        sort: { createdOn: SortingOrder.Descending },
        limit: 100,
        lookup: { _id: { statuses: contact.class.Status } }
      }
    )
  }

  $: updateEmployees(resultQuery)
</script>

<div class="container">
  <Scroller>
    <div>
      {#each employees as employee}
        <div class="fs-title item">
          <EmployeePresenter value={employee} avatarSize="medium" />
        </div>
      {/each}
    </div>
  </Scroller>
</div>

<style lang="scss">
  .container {
    border-top: 1px solid var(--divider-color);
  }
  .item {
    color: var(--caption-color);
    padding: 0.5rem 2rem;

    &:hover,
    &:focus {
      background-color: var(--popup-bg-hover);
    }
  }
</style>
