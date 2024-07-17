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
  import { AccountRole, Blob, Ref, getCurrentAccount, hasAccountRole } from '@hcengineering/core'
  import { createFile, type Drive } from '@hcengineering/drive'
  import { setPlatformStatus, unknownError } from '@hcengineering/platform'
  import { createQuery, FileOrBlob, getClient, getFileMetadata } from '@hcengineering/presentation'
  import { Button, ButtonWithDropdown, IconAdd, IconDropdown, Loading, SelectPopupValueType } from '@hcengineering/ui'
  import { showFilesUploadPopup } from '@hcengineering/uploader-resources'

  import drive from '../plugin'
  import { getFolderIdFromFragment } from '../navigation'
  import { createDrive, createFolder } from '../utils'

  export let currentSpace: Ref<Drive> | undefined
  export let currentFragment: string | undefined

  const me = getCurrentAccount()

  const client = getClient()
  const query = createQuery()

  let loading = true
  let hasDrive = false
  query.query(
    drive.class.Drive,
    { archived: false, members: me._id },
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
    await createDrive()
  }

  async function handleCreateFolder (): Promise<void> {
    await createFolder(currentSpace, parent, true)
  }

  async function handleUploadFile (): Promise<void> {
    if (currentSpace !== undefined) {
      const space = currentSpace
      const target = parent !== drive.ids.Root
        ? { objectId: parent, objectClass: drive.class.Folder }
        : { objectId: space, objectClass: drive.class.Drive }
      showFilesUploadPopup(target, {}, async (uuid: string, name: string, file: FileOrBlob) => {
        try {
          const metadata = await getFileMetadata(file, uuid as Ref<Blob>)
          const data = {
            file: uuid as Ref<Blob>,
            size: file.size,
            type: file.type,
            lastModified: file instanceof File ? file.lastModified : Date.now(),
            name,
            metadata
          }

          await createFile(client, space, parent, data)
        } catch (err) {
          void setPlatformStatus(unknownError(err))
        }
      })
    }
  }

  const dropdownItems = hasAccountRole(me, AccountRole.User)
    ? [
        { id: drive.string.CreateDrive, label: drive.string.CreateDrive, icon: drive.icon.Drive },
        { id: drive.string.CreateFolder, label: drive.string.CreateFolder, icon: drive.icon.Folder },
        { id: drive.string.UploadFile, label: drive.string.UploadFile, icon: drive.icon.File }
        // { id: drive.string.UploadFolder, label: drive.string.UploadFolder }
      ]
    : [
        { id: drive.string.CreateFolder, label: drive.string.CreateFolder, icon: drive.icon.Folder },
        { id: drive.string.UploadFile, label: drive.string.UploadFile, icon: drive.icon.File }
        // { id: drive.string.UploadFolder, label: drive.string.UploadFolder }
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
