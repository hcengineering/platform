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
  import { getResource } from '@hcengineering/platform'
  import type {
    NotificationGroup,
    NotificationPreferencesGroup,
    NotificationSetting,
    NotificationType
  } from '@hcengineering/notification'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import notification from '../plugin'
  import GroupElement from './GroupElement.svelte'
  import NotificationGroupSetting from './NotificationGroupSetting.svelte'

  const client = getClient()
  let groups: NotificationGroup[] = []
  let preferencesGroups: NotificationPreferencesGroup[] = []

  client.findAll(notification.class.NotificationGroup, {}).then((res) => {
    groups = res
  })

  let settings: Map<Ref<NotificationType>, NotificationSetting[]> = new Map()

  const query = createQuery()

  query.query(notification.class.NotificationSetting, {}, (res) => {
    settings = new Map()
    for (const value of res) {
      const arr = settings.get(value.type) ?? []
      arr.push(value)
      settings.set(value.type, arr)
    }
    settings = settings
  })

  let group: Ref<NotificationGroup> | undefined = undefined
  let currentPreferenceGroup: NotificationPreferencesGroup | undefined = undefined

  client.findAll(notification.class.NotificationPreferencesGroup, {}).then((res) => {
    preferencesGroups = res
  })

  $: if (!group && !currentPreferenceGroup) {
    if (preferencesGroups.length > 0) {
      currentPreferenceGroup = preferencesGroups[0]
    } else if (groups.length > 0) {
      group = groups[0]._id
    }
  }
</script>

<div class="flex h-full">
  <div class="antiPanel-navigator filled indent">
    <div class="antiNav-header">
      <span class="fs-title overflow-label">
        <Label label={notification.string.Notifications} />
      </span>
    </div>
    {#each preferencesGroups as preferenceGroup}
      <GroupElement
        icon={preferenceGroup.icon}
        label={preferenceGroup.label}
        selected={preferenceGroup === currentPreferenceGroup}
        on:click={() => {
          currentPreferenceGroup = preferenceGroup
          group = undefined
        }}
      />
    {/each}
    {#if preferencesGroups.length > 0 && groups.length > 0}
      <div class="antiNav-divider short line" />
    {/if}
    {#each groups as gr}
      <GroupElement
        icon={gr.icon}
        label={gr.label}
        selected={gr._id === group}
        on:click={() => {
          group = gr._id
          currentPreferenceGroup = undefined
        }}
      />
    {/each}
  </div>

  <div class="antiPanel-component border-left filled">
    {#if group}
      <NotificationGroupSetting {group} {settings} />
    {/if}
    {#if currentPreferenceGroup}
      {#await getResource(currentPreferenceGroup.presenter) then presenter}
        <svelte:component this={presenter} />
      {/await}
    {/if}
  </div>
</div>
