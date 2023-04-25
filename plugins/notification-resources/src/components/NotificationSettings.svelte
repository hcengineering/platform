<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Ref } from '@hcengineering/core'
  import type { NotificationGroup, NotificationSetting, NotificationType } from '@hcengineering/notification'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import notification from '../plugin'
  import GroupElement from './GroupElement.svelte'
  import NotificationGroupSetting from './NotificationGroupSetting.svelte'

  const client = getClient()
  let groups: NotificationGroup[] = []
  client.findAll(notification.class.NotificationGroup, {}).then((res) => {
    groups = res
    group = res[0]._id
  })

  let settings: Map<Ref<NotificationType>, NotificationSetting[]> = new Map()

  const query = createQuery()

  query.query(notification.class.NotificationSetting, {}, (res) => {
    console.log('settings updated')
    settings = new Map()
    for (const value of res) {
      const arr = settings.get(value.type) ?? []
      arr.push(value)
      settings.set(value.type, arr)
    }
    settings = settings
  })

  let group: Ref<NotificationGroup> | undefined = undefined
</script>

<div class="flex h-full">
  <div class="antiPanel-navigator filled indent">
    <div class="antiNav-header">
      <span class="fs-title overflow-label">
        <Label label={notification.string.Notifications} />
      </span>
    </div>
    {#each groups as gr}
      <GroupElement
        icon={gr.icon}
        label={gr.label}
        selected={gr._id === group}
        on:click={() => {
          group = gr._id
        }}
      />
    {/each}
  </div>

  <div class="antiPanel-component border-left filled">
    {#if group}
      <NotificationGroupSetting {group} {settings} />
    {/if}
  </div>
</div>
