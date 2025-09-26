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
<<<<<<< ours
  import { AccountRole, Ref, getCurrentAccount, hasAccountRole } from '@hcengineering/core'
=======
  import core, { AccountRole, Ref, getCurrentAccount } from '@hcengineering/core'
>>>>>>> theirs
  import { type Drive } from '@hcengineering/drive'
  import { getResource } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Button, ButtonWithDropdown, IconAdd, IconDropdown, Loading, SelectPopupValueType } from '@hcengineering/ui'
  import { FileUploadOptions, getUploadHandlers, UploadHandler } from '@hcengineering/uploader'
  import drive from '../plugin'
  import { getFolderIdFromFragment } from '../navigation'
  import {
    showCreateDrivePopup,
    showCreateFolderPopup,
    uploadFilesToDrivePopup,
    getUploadOptionsByFragment
  } from '../utils'
  import { onMount } from 'svelte'

  export let currentSpace: Ref<Drive> | undefined
  export let currentFragment: string | undefined

  const myAcc = getCurrentAccount()

  const client = getClient()
  const query = createQuery()
  const actionWithExtensionMap = new Map<string, UploadHandler>()

  onMount(() => {
    const handlers = getUploadHandlers(client)
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
      const opts = await getUploadOptionsByFragment(currentSpace, currentFragment ?? '')
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

  let visibleActions: string[] = []
  function updateActions (hasSpace: boolean): void {
    if (hasSpace) {
      visibleActions = [
        drive.string.CreateDrive,
        drive.string.CreateFolder,
        drive.string.UploadFile
      ]
    } else {
      visibleActions = [
        drive.string.CreateDrive
      ]
    }
  }

  $: updateActions(hasDrive)
</script>

<HeaderButton
  {loading}
  {client}
  mainActionId={drive.string.UploadFile}
  {visibleActions}
  actions={[
    {
      id: drive.string.CreateDrive,
      label: drive.string.CreateDrive,
      icon: drive.icon.Drive,
      accountRole: AccountRole.User,
      callback: handleCreateDrive
    },
    {
      id: drive.string.CreateFolder,
      label: drive.string.CreateFolder,
      icon: drive.icon.Folder,
      callback: handleCreateFolder
    },
    {
      id: drive.string.UploadFile,
      label: drive.string.UploadFile,
      icon: drive.icon.File,
      callback: handleUploadFile
    }]}
/>
