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
  import type { Comment } from '@anticrm/chunter'
  import { formatName } from '@anticrm/contact'
  import { Avatar, getClient, MessageViewer } from '@anticrm/presentation'
  import { TimeSince } from '@anticrm/ui'
  import { getTime, getUser } from '../utils'

  export let value: Comment

  const client = getClient()
</script>

<div class="flex-row-top">
  <div class="avatar">
    <Avatar size={'medium'} />
  </div>
  <div class="flex-grow flex-col">
    <div class="header">
      <div class="fs-title">
        {#await getUser(client, value.modifiedBy) then user}
          {#if user}{formatName(user.name)}{/if}
        {/await}
      </div>
      <div class="content-trans-color ml-4"><TimeSince value={value.modifiedOn} /></div>
    </div>
    <div class="comment-content">
      <MessageViewer message={value.message}/>
    </div>
  </div>
</div>

<style lang="scss">
  .avatar {
    margin-right: 1rem;
    min-width: 2.25rem;
  }
  .header {
    display: inline-flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: .25rem;
  }
  .comment-content {
    overflow: hidden;
    visibility: visible;
    display: -webkit-box;
    -webkit-line-clamp: 7;
    line-clamp: 7;
    /* autoprefixer: ignore next */
    -webkit-box-orient: vertical;
  }
</style>