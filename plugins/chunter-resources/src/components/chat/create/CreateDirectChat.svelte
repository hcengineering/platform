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
  import { createEventDispatcher, onMount } from 'svelte'

  import { Employee } from '@hcengineering/contact'
  import { AccountUuid, Ref, notEmpty } from '@hcengineering/core'
  import { employeeByIdStore, SelectUsersPopup } from '@hcengineering/contact-resources'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { Modal, showPopup } from '@hcengineering/ui'

  import chunter from '../../../plugin'
  import { buildDmName, createDirect } from '../../../utils'
  import ChannelMembers from '../../ChannelMembers.svelte'
  import { openChannel } from '../../../navigation'

  const dispatch = createEventDispatcher()
  const client = getClient()

  let employeeIds: Ref<Employee>[] = []
  let dmName = ''
  let hidden = true

  $: accounts = employeeIds.map((e) => $employeeByIdStore.get(e)?.personUuid).filter(notEmpty)
  $: void loadDmName(accounts).then((r) => {
    dmName = r
  })

  async function loadDmName (accs: AccountUuid[]): Promise<string> {
    return await buildDmName(client, accs)
  }

  async function createDirectMessage (): Promise<void> {
    const dmId = await createDirect(employeeIds)

    if (dmId !== undefined) {
      openChannel(dmId, chunter.class.DirectMessage)
      dispatch('close')
    }
  }

  function handleCancel (): void {
    dispatch('close')
  }

  onMount(() => {
    openSelectUsersPopup(true)
  })

  function addMembersClicked (): void {
    openSelectUsersPopup(false)
  }

  function openSelectUsersPopup (closeOnClose: boolean): void {
    showPopup(
      SelectUsersPopup,
      {
        okLabel: presentation.string.Next,
        skipCurrentAccount: false,
        skipInactive: true,
        selected: employeeIds,
        showStatus: true
      },
      'top',
      (result?: Ref<Employee>[]) => {
        if (result != null) {
          employeeIds = result
          hidden = false
        } else if (closeOnClose) {
          dispatch('close')
        }
      }
    )
    hidden = true
  }
</script>

<Modal
  label={chunter.string.NewDirectChat}
  type="type-popup"
  {hidden}
  okLabel={presentation.string.Create}
  okAction={createDirectMessage}
  canSave={employeeIds.length > 0}
  onCancel={handleCancel}
  on:close
>
  <div class="hulyModal-content__titleGroup" style="padding: 0">
    <div class="title overflow-label mb-4" title={dmName}>
      {dmName}
    </div>

    <ChannelMembers
      ids={employeeIds}
      on:add={addMembersClicked}
      on:remove={(ev) => {
        employeeIds = employeeIds.filter((id) => id !== ev.detail)
      }}
    />
  </div>
</Modal>

<style lang="scss">
  .title {
    font-size: 1.25rem;
    font-weight: 500;
    padding: var(--spacing-1);
    max-width: 40rem;
    color: var(--global-primary-TextColor);
  }
</style>
