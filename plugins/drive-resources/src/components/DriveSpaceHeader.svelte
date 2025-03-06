<!--
// Copyright © 2024-2025 Hardcore Engineering Inc.
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
  import { FileUploadOptions, getUploadHandlers, UploadHandler } from '@hcengineering/uploader'
  import drive from '../plugin'
  import { getFolderIdFromFragment, findFolderIdFromFragment } from '../navigation'
  import { showCreateDrivePopup, showCreateFolderPopup, uploadFilesToDrivePopup, getUploadOptions } from '../utils'
  import { getResource } from '@hcengineering/platform'
  import { onMount } from 'svelte'

  export let currentSpace: Ref<Drive> | undefined
  export let currentFragment: string | undefined

  const myAcc = getCurrentAccount()

  const query = createQuery()
  const actionWithExtensionMap = new Map<string, UploadHandler>()

  onMount(async () => {
    const handlers = await getUploadHandlers()
    for (const handler of handlers) {
      dropdownItems.push({ id: handler._id, label: handler.label, icon: handler.icon })
      const uploadHandler = async (opts: FileUploadOptions): Promise<void> => {
        const fn = await getResource(handler.handler)
        await fn(opts)
      }
      actionWithExtensionMap.set(handler._id, uploadHandler)
    }
  })

  let loading = true
  let hasDrive = false
  query.query(
    drive.class.Drive,
    { archived: false, members: myAcc.uuid },
    (res) => {
      hasDrive = res.length > 0
    },
    { limit: 1, projection: { _id: 1 } }
  )

  $: parent = getFolderIdFromFragment(currentFragment ?? '') ?? drive.ids.Root

  async function handleDropdownItemSelected (res?: SelectPopupValueType['id']): Promise<void> {
    if (res === drive.string.CreateDrive) {
      await handleCreateDrive()
    } else if (res === drive.string.CreateFolder) {
      await handleCreateFolder()
    } else if (typeof res === 'string' && currentSpace !== undefined) {
      const findRes = await findFolderIdFromFragment(currentFragment ?? '')
      const opts = await getUploadOptions(
        (findRes.space as Ref<Drive>) ?? currentSpace,
        findRes.folder ?? drive.ids.Root
      )
      const uploadFn = actionWithExtensionMap.get(res)
      if (uploadFn === undefined) {
        return
      }
      await uploadFn(opts)
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

  const dropdownItems: SelectPopupValueType[] = hasAccountRole(myAcc, AccountRole.User)
    ? [
        { id: drive.string.CreateDrive, label: drive.string.CreateDrive, icon: drive.icon.Drive },
        { id: drive.string.CreateFolder, label: drive.string.CreateFolder, icon: drive.icon.Folder }
      ]
    : [{ id: drive.string.CreateFolder, label: drive.string.CreateFolder, icon: drive.icon.Folder }]

  loading = false
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
