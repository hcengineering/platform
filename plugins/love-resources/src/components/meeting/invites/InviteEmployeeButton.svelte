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
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { ButtonBaseSize, IconSize, ModernButton, showPopup } from '@hcengineering/ui'
  import { Employee } from '@hcengineering/contact'
  import { currentMeetingRoom } from '../../../meetings'
  import love from '../../../plugin'
  import { SelectUsersPopup } from '@hcengineering/contact-resources'
  import { Ref } from '@hcengineering/core'
  import { createEventDispatcher } from 'svelte'
  import { sendInvites } from '../../../invites'
  import { infos } from '../../../stores'

  export let employee: Employee | undefined = undefined
  export let kind: 'primary' | 'secondary' | 'tertiary' | 'negative' = 'secondary'
  export let type: 'type-button' | 'type-button-icon' = 'type-button'
  export let size: ButtonBaseSize = 'small'
  export let iconSize: IconSize = 'small'
  export let withBackground: boolean = true

  const dispatch = createEventDispatcher()

  async function invite (): Promise<void> {
    if (employee !== undefined) {
      sendInvites([employee._id])
    } else {
      openSelectUsersPopup()
    }
  }

  function openSelectUsersPopup (): void {
    const skipAccounts = $infos.filter((p) => p.room === currentMeetingRoom).map((p) => p.person)
    showPopup(
      SelectUsersPopup,
      {
        okLabel: love.string.Invite,
        skipCurrentAccount: true,
        skipAccounts,
        skipInactive: true,
        showStatus: true
      },
      'top',
      (result?: Ref<Employee>[]) => {
        if (result != null) {
          sendInvites(result)
        }
        dispatch('close')
      }
    )
  }
</script>

<div class:button-container={withBackground}>
  <ModernButton
    label={type === 'type-button-icon' ? undefined : love.string.Invite}
    icon={love.icon.Invite}
    {size}
    {iconSize}
    {type}
    {kind}
    on:click={invite}
  />
</div>

<style lang="scss">
  .button-container {
    border-radius: var(--small-BorderRadius);
    display: flex;
    background-color: var(--theme-button-container-color);
  }
</style>
