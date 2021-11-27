<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { Avatar, getClient } from '@anticrm/presentation'
  import type { Comment } from '@anticrm/chunter'
  import contact, { EmployeeAccount, formatName } from '@anticrm/contact'

  import { MessageViewer } from '@anticrm/presentation'
  import { Account, Ref } from '@anticrm/core'

  export let value: Comment

  const client = getClient()

  async function getUser (user: Ref<EmployeeAccount> | Ref<Account>): Promise<EmployeeAccount | undefined> {
    return await client.findOne(contact.class.EmployeeAccount, { _id: user as Ref<EmployeeAccount> })
  }

  function getTime (time: number): string {
    let options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: 'numeric' }
    if (!isToday(time)) {
      options = {
        month: 'numeric',
        day: 'numeric',
        ...options
      }
    }

    return new Date(value.modifiedOn).toLocaleString('default', options)
  }

  function isToday (time: number): boolean {
    const current = new Date()
    const target = new Date(time)
    return (
      current.getDate() === target.getDate() &&
      current.getMonth() === target.getMonth() &&
      current.getFullYear() === target.getFullYear()
    )
  }
</script>

<div class="container">
  <div class="avatar"><Avatar size={'medium'} /></div>
  <div class="message">
    <div class="header">
      {#await getUser(value.modifiedBy) then user}
        {#if user}{formatName(user.name)}{/if}
      {/await}
      <span>{getTime(value.modifiedOn)}</span>
    </div>
    <div class="text"><MessageViewer message={value.message} /></div>
  </div>
</div>

<style lang="scss">
  .container {
    display: flex;

    .avatar {
      min-width: 2.25rem;
    }

    .message {
      display: flex;
      flex-direction: column;
      width: 100%;
      margin-left: 1rem;

      .header {
        font-weight: 500;
        font-size: 1rem;
        line-height: 150%;
        color: var(--theme-caption-color);
        margin-bottom: 0.25rem;

        span {
          margin-left: 0.5rem;
          font-weight: 400;
          font-size: 0.875rem;
          line-height: 1.125rem;
          opacity: 0.4;
        }
      }
      .text {
        line-height: 150%;
      }
    }
  }
</style>
