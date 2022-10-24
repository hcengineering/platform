<!--
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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
  import { createEventDispatcher } from 'svelte'
  import attachment from '@hcengineering/attachment'
  import { AnySvelteComponent, IconSize, showPopup } from '@hcengineering/ui'
  import { AvatarType, Avatar } from '@hcengineering/contact'
  import { Asset, getResource } from '@hcengineering/platform'

  import { getAvatarColorForId } from '../utils'
  import AvatarComponent from './Avatar.svelte'
  import SelectAvatarPopup from './SelectAvatarPopup.svelte'

  export let avatar: Avatar | null | undefined
  export let email: string | undefined = undefined
  export let id: string
  export let size: IconSize
  export let direct: Blob | undefined = undefined
  export let icon: Asset | AnySvelteComponent | undefined = undefined

  let selectedAvatarType: AvatarType | undefined = avatar?.type
  let selectedAvatar: string | undefined = avatar?.value

  export async function createAvatar (): Promise<Avatar | undefined> {
    if (selectedAvatarType === 'image' && direct !== undefined) {
      const uploadFile = await getResource(attachment.helper.UploadFile)
      const file = new File([direct], 'avatar')

      return { type: selectedAvatarType, value: await uploadFile(file) }
    }
    if (selectedAvatarType && selectedAvatar) {
      return { type: selectedAvatarType, value: selectedAvatar }
    }
  }

  export async function removeAvatar (avatar: Avatar) {
    if (avatar.type === 'image') {
      const deleteFile = await getResource(attachment.helper.DeleteFile)
      await deleteFile(avatar.value)
    }
  }

  function handlePopupSubmit (submittedAvatarType?: AvatarType, submittedAvatar?: string, submittedDirect?: Blob) {
    selectedAvatarType = submittedAvatarType
    selectedAvatar = submittedAvatar
    direct = submittedDirect
    dispatch('done')
  }
  const dispatch = createEventDispatcher()

  async function showSelectionPopup (e: MouseEvent) {
    showPopup(SelectAvatarPopup, { avatar, email, id, onSubmit: handlePopupSubmit })
  }
</script>

<div class="cursor-pointer" on:click|self={showSelectionPopup}>
  <AvatarComponent
    avatar={{ type: selectedAvatarType || 'color', value: selectedAvatar || getAvatarColorForId(id) }}
    {direct}
    {size}
    {icon}
  />
</div>
