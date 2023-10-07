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
  import {
    AnySvelteComponent,
    IconSize,
    showPopup,
    getPlatformAvatarColorForTextDef,
    themeStore
  } from '@hcengineering/ui'
  import { AvatarType } from '@hcengineering/contact'
  import { Asset, getResource } from '@hcengineering/platform'

  import AvatarComponent from './Avatar.svelte'
  import SelectAvatarPopup from './SelectAvatarPopup.svelte'

  export let avatar: string | null | undefined
  export let name: string | null | undefined = undefined
  export let email: string | undefined = undefined
  export let size: IconSize
  export let direct: Blob | undefined = undefined
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let disabled: boolean = false

  $: [schema, uri] = avatar?.split('://') || []

  let selectedAvatarType: AvatarType | undefined
  let selectedAvatar: string | null | undefined
  $: selectedAvatarType = avatar?.includes('://')
    ? (schema as AvatarType)
    : avatar === undefined
      ? AvatarType.COLOR
      : AvatarType.IMAGE
  $: selectedAvatar = selectedAvatarType === AvatarType.IMAGE ? avatar : uri
  $: if (selectedAvatar === undefined && selectedAvatarType === AvatarType.COLOR) {
    selectedAvatar = getPlatformAvatarColorForTextDef(name ?? '', $themeStore.dark).name
  }

  export async function createAvatar (): Promise<string | undefined> {
    if (selectedAvatarType === AvatarType.IMAGE && direct !== undefined) {
      const uploadFile = await getResource(attachment.helper.UploadFile)
      const file = new File([direct], 'avatar')

      return await uploadFile(file)
    }
    if (selectedAvatarType && selectedAvatar) {
      return `${selectedAvatarType}://${selectedAvatar}`
    }
  }

  export async function removeAvatar (avatar: string) {
    if (!avatar.includes('://')) {
      const deleteFile = await getResource(attachment.helper.DeleteFile)
      await deleteFile(avatar)
    }
  }

  function handlePopupSubmit (submittedAvatarType?: AvatarType, submittedAvatar?: string, submittedDirect?: Blob) {
    selectedAvatarType = submittedAvatarType
    selectedAvatar = submittedAvatar
    direct = submittedDirect
    avatar = selectedAvatarType === AvatarType.IMAGE ? selectedAvatar : `${selectedAvatarType}://${selectedAvatar}`
    dispatch('done')
  }
  const dispatch = createEventDispatcher()

  async function showSelectionPopup (e: MouseEvent) {
    if (!disabled) {
      showPopup(SelectAvatarPopup, {
        avatar:
          selectedAvatarType === AvatarType.IMAGE
            ? selectedAvatar
            : selectedAvatarType === AvatarType.COLOR && avatar == null
              ? undefined
              : `${selectedAvatarType}://${selectedAvatar}`,
        email,
        name,
        file: direct,
        icon,
        onSubmit: handlePopupSubmit
      })
    }
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="cursor-pointer" on:click|self={showSelectionPopup}>
  <AvatarComponent
    {direct}
    {size}
    {icon}
    avatar={selectedAvatarType === AvatarType.IMAGE
      ? selectedAvatar
      : selectedAvatarType === AvatarType.COLOR && avatar == null
      ? undefined
      : `${selectedAvatarType}://${selectedAvatar}`}
    {name}
  />
</div>
