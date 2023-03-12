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
  import { AttachmentDocList } from '@hcengineering/attachment-resources'
  import type { Comment } from '@hcengineering/chunter'
  import chunter from '@hcengineering/chunter'
  import contact, { Employee, EmployeeAccount, getName } from '@hcengineering/contact'
  import { Ref } from '@hcengineering/core'
  import { Avatar, getClient, MessageViewer } from '@hcengineering/presentation'
  import { Icon, ShowMore, TimeSince } from '@hcengineering/ui'

  export let value: Comment
  export let inline: boolean = false
  export let disableClick = false

  const client = getClient()

  const cutId = (str: string): string => {
    return str.slice(0, 4) + '...' + str.slice(-4)
  }

  async function getEmployee (value: Comment): Promise<Employee | undefined> {
    const acc = await client.findOne(contact.class.EmployeeAccount, { _id: value.modifiedBy as Ref<EmployeeAccount> })
    if (acc !== undefined) {
      const emp = await client.findOne(contact.class.Employee, { _id: acc.employee })
      return emp
    }
  }
</script>

{#if inline}
  <a class="flex-presenter inline-presenter" href="#{disableClick ? null : ''}">
    <div class="icon">
      <Icon icon={chunter.icon.Thread} size={'small'} />
    </div>
    <span class="label nowrap">Message</span>
  </a>
  &nbsp;<span class="dark-color">#{cutId(value._id.toString())}</span>
{:else}
  <div class="flex-row-top">
    {#await getEmployee(value) then employee}
      <div class="avatar">
        <Avatar size={'medium'} avatar={employee?.avatar} />
      </div>
      <div class="flex-grow flex-col select-text">
        <div class="header">
          <div class="fs-title">
            {#if employee}{getName(employee)}{/if}
          </div>
          <div class="dark-color ml-4"><TimeSince value={value.modifiedOn} /></div>
        </div>
        <ShowMore limit={126} fixed>
          <MessageViewer message={value.message} />
          <AttachmentDocList {value} />
        </ShowMore>
      </div>
    {/await}
  </div>
{/if}

<style lang="scss">
  .avatar {
    margin-right: 1rem;
    min-width: 2.25rem;
  }
  .header {
    display: inline-flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 0.25rem;
  }
</style>
