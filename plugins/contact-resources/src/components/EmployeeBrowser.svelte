<script lang="ts">
  import contact, { Employee } from '@anticrm/contact'
  import { DocumentQuery, SortingOrder } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import { Scroller } from '@anticrm/ui'
  import EmployeePresenter from './EmployeePresenter.svelte'

  export let search: string = ''
  const client = getClient()
  $: searchQuery = search.length ? { $search: search } : {}
  $: resultQuery = { ...searchQuery }
  let employees: Employee[] = []

  async function updateMessages (resultQuery: DocumentQuery<Employee>) {
    employees = await client.findAll(
      contact.class.Employee,
      {
        ...resultQuery
      },
      {
        sort: { createOn: SortingOrder.Descending },
        limit: 100,
        lookup: { _id: { statuses: contact.class.Status } }
      }
    )
  }

  $: updateMessages(resultQuery)
</script>

<div class="mt-4 pt-4 container">
  <Scroller>
    {#each employees as employee}
      <div class="fs-title item">
        <EmployeePresenter value={employee} avatarSize="medium" />
      </div>
    {/each}
  </Scroller>
</div>

<style lang="scss">
  .container {
    border-top: 1px solid var(--divider-color);
  }
  .item {
    color: var(--caption-color);
    cursor: pointer;
    padding: 0.5rem 2rem;

    &:hover,
    &:focus {
      background-color: var(--popup-bg-hover);
    }
  }
</style>
