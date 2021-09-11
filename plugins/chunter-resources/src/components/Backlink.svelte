<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
  import type { Comment } from '@anticrm/chunter'
  import { getClient } from '@anticrm/presentation'
  import type { Ref } from '@anticrm/core'

  import MessageViewer from '@anticrm/presentation/src/components/MessageViewer.svelte'
  import Avatar from '@anticrm/presentation/src/components/Avatar.svelte'
  import { TimeSince } from '@anticrm/ui'

  import contact, { Employee, EmployeeAccount } from '@anticrm/contact'

  export let comment: Comment

  let employee: EmployeeAccount | undefined

  console.log('comment modified by', comment.modifiedBy)

  const client = getClient()
  client.findOne(contact.class.EmployeeAccount, { _id: comment.modifiedBy as Ref<EmployeeAccount> }).then(account => {employee = account})

</script>

<div class="flex-nowrap">
  <div class="avatar"><Avatar size={'medium'} /></div>
  <div class="flex-col-stretch message">
    <div class="header">{#if employee}{employee.firstName} {employee.lastName}{/if}<span><TimeSince value={comment.modifiedOn}/></span></div>
    <div class="text"><MessageViewer message={comment.message} /></div>
  </div>
</div>

<style lang="scss">
  .avatar {
    margin-right: 1rem;
  }
  .message {
    margin-right: 1.25rem;

    .header {
      margin-bottom: .25rem;
      font-weight: 500;
      font-size: 1rem;
      line-height: 150%;
      color: var(--theme-caption-color);

      span {
        margin-left: .5rem;
        font-weight: 400;
        font-size: .875rem;
        color: var(--theme-content-dark-color);
      }
    }

    .text {
      line-height: 150%;
      color: var(--theme-content-color);
    }
  }
</style>
