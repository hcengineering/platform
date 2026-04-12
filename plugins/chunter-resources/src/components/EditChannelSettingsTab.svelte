<!--
// Copyright © 2026 Hardcore Engineering Inc.
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
  import { Channel } from '@hcengineering/chunter'
  import core, { AccountRole, setWorkspaceGuestAutoJoinRoles } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Button, Label, Toggle } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import { ArchiveChannel } from '../index'
  import chunter from '../plugin'

  export let channel: Channel

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let autoJoin = channel.autoJoin ?? false
  let autoJoinForRoles: AccountRole[] =
    channel.autoJoinForRoles != null ? hierarchy.clone(channel.autoJoinForRoles) : []

  function normalizeAutoJoinForRoles (roles: AccountRole[]): AccountRole[] | undefined {
    return roles.length > 0 ? [...roles] : undefined
  }

  async function persistAutoJoin (): Promise<void> {
    await client.diffUpdate(channel, {
      autoJoin,
      autoJoinForRoles: normalizeAutoJoinForRoles(autoJoinForRoles)
    })
  }

  function setGuestAutoJoin (enabled: boolean): void {
    autoJoinForRoles = setWorkspaceGuestAutoJoinRoles(autoJoinForRoles, enabled)
    void persistAutoJoin()
  }
</script>

{#if channel}
  <div class="flex-col gap-4 p-2">
    <div class="flex-col gap-1">
      <div class="flex-row-center gap-2">
        <Label label={core.string.AutoJoin} />
        <Toggle
          bind:on={autoJoin}
          on:change={() => {
            void persistAutoJoin()
          }}
        />
      </div>
      <span class="text-sm content-dark-color"><Label label={core.string.AutoJoinDescr} /></span>
    </div>
    <div class="flex-col gap-1">
      <div class="flex-row-center gap-2">
        <Label label={core.string.AutoJoinGuests} />
        <Toggle
          on={autoJoinForRoles.includes(AccountRole.Guest)}
          on:change={(ev) => {
            setGuestAutoJoin(ev.detail)
          }}
        />
      </div>
      <span class="text-sm content-dark-color"><Label label={core.string.AutoJoinGuestsDescr} /></span>
    </div>
  </div>
  <Button
    label={chunter.string.ArchiveChannel}
    justify={'left'}
    size={'x-large'}
    on:click={(evt) => {
      ArchiveChannel(channel, evt, { afterArchive: () => dispatch('close') })
    }}
  />
{/if}
