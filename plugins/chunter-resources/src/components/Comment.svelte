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
  import { getName, Person } from '@hcengineering/contact'
  import { Avatar } from '@hcengineering/contact-resources'
  import { getClient } from '@hcengineering/presentation'

  interface IMessage {
    text: string
    createDate: Date
  }

  export let user: Person
  export let message: IMessage
  const client = getClient()
</script>

<div class="flex-nowrap">
  <div class="avatar"><Avatar size={'medium'} avatar={user.avatar} name={user.name} /></div>
  <div class="flex-col-stretch message">
    <div class="header">{getName(client.getHierarchy(), user)}<span>{message.createDate}</span></div>
    <div class="text">{message.text}</div>
  </div>
</div>

<style lang="scss">
  .avatar {
    margin-right: 1rem;
  }
  .message {
    margin-right: 1.25rem;

    .header {
      margin-bottom: 0.25rem;
      font-weight: 500;
      font-size: 1rem;
      line-height: 150%;
      color: var(--caption-color);

      span {
        margin-left: 0.5rem;
        font-weight: 400;
        font-size: 0.875rem;
        color: var(--dark-color);
      }
    }

    .text {
      line-height: 150%;
      color: var(--content-color);
    }
  }
</style>
