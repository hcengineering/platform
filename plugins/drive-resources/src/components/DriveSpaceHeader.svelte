<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { AccountRole, Ref, getCurrentAccount, hasAccountRole } from '@hcengineering/core'
  import { type Drive } from '@hcengineering/drive'
  import { createQuery } from '@hcengineering/presentation'
  import { Button, ButtonWithDropdown, IconAdd, IconDropdown, Loading, SelectPopupValueType } from '@hcengineering/ui'

  import drive from '../plugin'
  import { getFolderIdFromFragment } from '../navigation'
  import { showCreateDrivePopup, showCreateFolderPopup, uploadFilesToDrivePopup } from '../utils'

  export let currentSpace: Ref<Drive> | undefined
  export let currentFragment: string | undefined

  const myAcc = getCurrentAccount()

  const query = createQuery()

  let loading = true
  let hasDrive = false
  query.query(
    drive.class.Drive,
    { archived: false, members: myAcc.uuid },
    (res) => {
      hasDrive = res.length > 0
      loading = false
    },
    { limit: 1, projection: { _id: 1 } }
  )

  $: parent = getFolderIdFromFragment(currentFragment ?? '') ?? drive.ids.Root

  async function handleDropdownItemSelected (res?: SelectPopupValueType['id']): Promise<void> {
    if (res === drive.string.CreateDrive) {
      await handleCreateDrive()
    } else if (res === drive.string.CreateFolder) {
      await handleCreateFolder()
    } else if (res === drive.string.UploadFile) {
      await handleUploadFile()
    }
  }

  async function handleCreateDrive (): Promise<void> {
    await showCreateDrivePopup()
  }

  async function handleCreateFolder (): Promise<void> {
    await showCreateFolderPopup(currentSpace, parent, true)
  }

  async function handleUploadFile (): Promise<void> {
    if (currentSpace !== undefined) {
      await uploadFilesToDrivePopup(currentSpace, parent)
    }
  }

  const dropdownItems = hasAccountRole(myAcc, AccountRole.User)
    ? [
        { id: drive.string.CreateDrive, label: drive.string.CreateDrive, icon: drive.icon.Drive },
        { id: drive.string.CreateFolder, label: drive.string.CreateFolder, icon: drive.icon.Folder },
        { id: drive.string.UploadFile, label: drive.string.UploadFile, icon: drive.icon.File }
      ]
    : [
        { id: drive.string.CreateFolder, label: drive.string.CreateFolder, icon: drive.icon.Folder },
        { id: drive.string.UploadFile, label: drive.string.UploadFile, icon: drive.icon.File }
      ]
</script>

{#if loading}
  <Loading shrink />
{:else}
  <div class="antiNav-subheader">
    {#if hasDrive}
      <ButtonWithDropdown
        icon={IconAdd}
        justify={'left'}
        kind={'primary'}
        label={drive.string.UploadFile}
        mainButtonId={'new-document'}
        dropdownIcon={IconDropdown}
        {dropdownItems}
        disabled={currentSpace === undefined}
        on:click={handleUploadFile}
        on:dropdown-selected={(ev) => {
          void handleDropdownItemSelected(ev.detail)
        }}
      />
    {:else}
      <Button
        icon={IconAdd}
        label={drive.string.CreateDrive}
        justify={'left'}
        width={'100%'}
        kind={'primary'}
        gap={'large'}
        on:click={handleCreateDrive}
      />
    {/if}
  </div>
{/if}
