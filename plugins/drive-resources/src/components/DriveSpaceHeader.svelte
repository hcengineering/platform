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
  import core, { AccountRole, Ref, getCurrentAccount } from '@hcengineering/core'
  import { type Drive } from '@hcengineering/drive'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { HeaderButton } from '@hcengineering/ui'

  import drive from '../plugin'
  import { getFolderIdFromFragment } from '../navigation'
  import { showCreateDrivePopup, showCreateFolderPopup, uploadFilesToDrivePopup } from '../utils'

  export let currentSpace: Ref<Drive> | undefined
  export let currentFragment: string | undefined

  const me = getCurrentAccount()

  const query = createQuery()
  const client = getClient()

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
      visibleActions = [drive.string.CreateDrive, drive.string.CreateFolder, drive.string.UploadFile]
    } else {
      visibleActions = [drive.string.CreateDrive]
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
    }
  ]}
/>
