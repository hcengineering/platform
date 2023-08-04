<!--
// Copyright © 2022 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import contact, { PersonAccount, getName, Employee } from '@hcengineering/contact'
  import { employeeByIdStore } from '@hcengineering/contact-resources'
  import { Doc, Ref, TxCUD } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Request } from '@hcengineering/request'
  import { Label, TimeSince } from '@hcengineering/ui'
  import { ObjectPresenter } from '@hcengineering/view-resources'
  import request from '../plugin'
  import RequestActions from './RequestActions.svelte'
  import RequestPresenter from './RequestPresenter.svelte'

  export let value: Request

  let account: PersonAccount | undefined
  $: employee = account && $employeeByIdStore.get(account.person as Ref<Employee>)

  const client = getClient()
  const query = createQuery()

  $: query.query(
    contact.class.PersonAccount,
    { _id: value.tx.modifiedBy as Ref<PersonAccount> },
    (res) => {
      ;[account] = res
    },
    { limit: 1 }
  )
  $: txCud = value.tx as TxCUD<Doc>
</script>

<div class="container">
  <div class="flex-between">
    <div class="label">
      <div class="bold">
        {#if employee}
          {getName(client.getHierarchy(), employee)}
        {/if}
      </div>
      <span class="lower">
        <Label label={request.string.CreatedRequest} />
        <Label label={request.string.For} />
      </span>
      <ObjectPresenter objectId={txCud.objectId} _class={txCud.objectClass} />
    </div>
    <div class="time"><TimeSince value={value.tx.modifiedOn} /></div>
  </div>
  <RequestPresenter {value} />

  <RequestActions {value} />
</div>

<style lang="scss">
  .container {
    background-color: var(--theme-bg-color);
    padding: 0.5rem 0.75rem 0.75rem;
    min-height: 0;
    border-radius: 0.75rem;
    border: 1px solid var(--divider-color);

    &:not(:last-child) {
      margin-bottom: 0.75rem;
    }
  }

  .label {
    display: flex;
    align-items: center;
    flex-wrap: wrap;

    & > * {
      margin-right: 0.25rem;
    }
    & > *:last-child {
      margin-right: 0;
    }
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
