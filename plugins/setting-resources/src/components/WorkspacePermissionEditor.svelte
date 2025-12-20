<!--
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { AccountArrayEditor, getAccountClient } from '@hcengineering/contact-resources'
  import { AccountUuid } from '@hcengineering/core'
  import { Analytics } from '@hcengineering/analytics'
  import { IntlString } from '@hcengineering/platform'
  import { Label, Loading } from '@hcengineering/ui'
  import { onMount } from 'svelte'

  import settingsRes from '../plugin'

  export let permission: string
  export let label: IntlString
  export let description: IntlString
  export let emptyLabel: IntlString | undefined = undefined
  export let allowGuests: boolean = false

  const accountClient = getAccountClient()
  let users: AccountUuid[] = []
  let loading = true

  onMount(() => {
    void loadPermissions()
  })

  async function loadPermissions (): Promise<void> {
    try {
      const result = await accountClient.getWorkspaceUsersWithPermission({
        permission
      })
      users = result
    } catch (e: any) {
      Analytics.handleError(e)
    } finally {
      loading = false
    }
  }

  async function handleUsersChange (newUsers: AccountUuid[]): Promise<void> {
    const currentUsers = new Set(users)
    const updatedUsers = new Set(newUsers)

    // Find users to add
    const toAdd = newUsers.filter((u) => !currentUsers.has(u))
    // Find users to remove
    const toRemove = users.filter((u) => !updatedUsers.has(u))

    try {
      // Assign permissions to new users in batch
      if (toAdd.length > 0) {
        await accountClient.batchAssignWorkspacePermission({
          accountIds: toAdd,
          permission
        })
      }

      // Revoke permissions from removed users in batch
      if (toRemove.length > 0) {
        await accountClient.batchRevokeWorkspacePermission({
          accountIds: toRemove,
          permission
        })
      }

      users = newUsers
    } catch (e: any) {
      Analytics.handleError(e)
      // Reload on error to restore previous state
      await loadPermissions()
    }
  }
</script>

<div class="flex-col flex-gap-4 mt-6">
  <div class="title"><Label {label} /></div>
  <div class="flex-row-center flex-gap-4">
    <div class="description"><Label label={description} /></div>
    {#if loading}
      <Loading />
    {:else}
      <AccountArrayEditor
        value={users}
        {label}
        emptyLabel={emptyLabel ?? settingsRes.string.SelectUsers}
        onChange={handleUsersChange}
        kind={'regular'}
        size={'large'}
        {allowGuests}
      />
    {/if}
  </div>
</div>

<style lang="scss">
  .title {
    font-weight: 500;
    font-size: 1rem;
  }
  .description {
    flex-shrink: 0;
  }
</style>
