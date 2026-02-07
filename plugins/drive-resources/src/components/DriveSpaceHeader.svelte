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
  import { AccountRole, Ref, getCurrentAccount } from '@hcengineering/core'
  import { checkMyPermission, permissionsStore } from '@hcengineering/contact-resources'
  import { type Drive } from '@hcengineering/drive'
  import { getResource } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { HeaderButton, HeaderButtonAction } from '@hcengineering/ui'
  import { getUploadHandlers } from '@hcengineering/uploader'
  import drive from '../plugin'
  import { getFolderIdFromFragment } from '../navigation'
  import { showCreateDrivePopup, showCreateFolderPopup, getUploadOptionsByFragment } from '../utils'
  import { onMount } from 'svelte'
  import { canCreateObject } from '@hcengineering/view-resources'

  export let currentSpace: Ref<Drive> | undefined
  export let currentFragment: string | undefined

  const basicActions: HeaderButtonAction[] = [
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
    }
  ]

  let uploadActions: HeaderButtonAction[] = []
  let filteredUploadActions: HeaderButtonAction[] = []
  let filteredBasicActions: HeaderButtonAction[] = []
  let allActions: HeaderButtonAction[] = []

  const myAcc = getCurrentAccount()

  const client = getClient()
  const query = createQuery()

  onMount(() => {
    const handlers = getUploadHandlers(client)
    const newUploadActions: HeaderButtonAction[] = []
    for (const handler of handlers) {
      const uploadHandler = async (): Promise<void> => {
        if (currentSpace === undefined) return
        const fn = await getResource(handler.handler)
        const opts = await getUploadOptionsByFragment(currentSpace, currentFragment ?? '')
        await fn(opts)
      }
      newUploadActions.push({
        id: handler.label,
        label: handler.label,
        icon: handler.icon,
        callback: () => {
          void uploadHandler()
        }
      })
    }
    uploadActions = newUploadActions
  })

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
  $: canCreateFolder =
    currentSpace !== undefined && canCreateObject(drive.class.Folder, currentSpace, $permissionsStore)
  $: canUpload = currentSpace !== undefined && canCreateObject(drive.class.File, currentSpace, $permissionsStore)

  $: filteredBasicActions = [basicActions[0], ...(canCreateFolder ? [basicActions[1]] : [])]
  $: filteredUploadActions = canUpload ? uploadActions : []

  function handleCreateDrive (): void {
    void showCreateDrivePopup()
  }

  function handleCreateFolder (): void {
    void showCreateFolderPopup(currentSpace, parent, true)
  }

  let visibleActions: (string | number | null)[] = []
  function updateActions (
    hasSpace: boolean,
    uploadActions: HeaderButtonAction[],
    basicActions: HeaderButtonAction[]
  ): void {
    allActions = [...basicActions, ...uploadActions]
    if (hasSpace) {
      visibleActions = allActions.map((a) => a.id)
    } else {
      visibleActions = [drive.string.CreateDrive]
    }
  }

  $: updateActions(hasDrive, filteredUploadActions, filteredBasicActions)
</script>

<HeaderButton
  loading={false}
  {client}
  mainActionId={filteredUploadActions[0]?.id}
  {visibleActions}
  actions={allActions}
/>
