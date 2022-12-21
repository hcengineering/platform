<script lang="ts">
  import contact, { EmployeeAccount, formatName } from '@hcengineering/contact'
  import { getCurrentAccount, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Request, RequestStatus } from '@hcengineering/request'
  import { Button, Label, TimeSince } from '@hcengineering/ui'
  import { ObjectPresenter } from '@hcengineering/view-resources'
  import request from '../plugin'
  import RequestPresenter from './RequestPresenter.svelte'

  export let value: Request

  let employee: EmployeeAccount | undefined

  const query = createQuery()
  const client = getClient()
  const me = getCurrentAccount()._id as Ref<EmployeeAccount>

  $: query.query(
    contact.class.EmployeeAccount,
    { _id: value.tx.modifiedBy as Ref<EmployeeAccount> },
    (account) => {
      ;[employee] = account
    },
    { limit: 1 }
  )

  const approvable =
    value.requested.includes(me) && !value.approved.includes(me) && value.status === RequestStatus.Active

  async function approve () {
    await client.update(value, {
      $push: {
        approved: me
      }
    })
  }
</script>

<div class="container">
  <div class="flex-between">
    <div class="label">
      <div class="bold">
        {#if employee}
          {formatName(employee.name)}
        {/if}
      </div>
      <span class="lower">
        <Label label={request.string.CreatedRequest} />
        <Label label={request.string.For} />
      </span>
      <ObjectPresenter objectId={value.tx.objectId} _class={value.tx.objectClass} />
    </div>
    <div class="time"><TimeSince value={value.tx.modifiedOn} /></div>
  </div>
  <RequestPresenter {value} />
  {#if approvable}
    <div class="mt-2">
      <Button label={request.string.Approve} on:click={approve} />
    </div>
  {/if}
</div>

<style lang="scss">
  .container {
    background-color: var(--body-color);
    margin: 0.5rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid var(--divider-color);
  }

  .label {
    display: flex;
    align-items: center;
    flex-wrap: wrap;

    & > * {
      margin-right: 0.5rem;
    }
    & > *:last-child {
      margin-right: 0;
    }
  }

  .lower {
    text-transform: lowercase;
  }

  .bold {
    font-weight: 500;
    color: var(--caption-color);
  }

  .time {
    align-self: baseline;
    margin-left: 1rem;
    color: var(--dark-color);
  }
</style>
