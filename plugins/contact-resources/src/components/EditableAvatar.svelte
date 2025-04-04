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
  import attachment from '@hcengineering/attachment'
  import { AvatarType, type AvatarInfo } from '@hcengineering/contact'
  import { Asset, getResource } from '@hcengineering/platform'
  import { AnySvelteComponent, IconSize, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import type { Data, Blob as PlatformBlob, Ref, WithLookup } from '@hcengineering/core'
  import AvatarComponent from './Avatar.svelte'
  import SelectAvatarPopup from './SelectAvatarPopup.svelte'

  export let person: Data<WithLookup<AvatarInfo>> | undefined
  export let name: string | null | undefined = undefined
  export let email: string | undefined = undefined
  export let size: IconSize
  export let direct: Blob | undefined = undefined
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let disabled: boolean = false
  export let imageOnly: boolean = false
  export let lessCrop: boolean = false

  $: selectedAvatarType = person?.avatarType ?? AvatarType.COLOR
  $: selectedAvatar = person?.avatar
  $: selectedAvatarProps = person?.avatarProps

  console.log('EditableAvatar')

  export async function createAvatar (): Promise<Data<AvatarInfo>> {
    const result: Data<AvatarInfo> = {
      avatarType: selectedAvatarType,
      avatarProps: selectedAvatarProps,
      avatar: selectedAvatar
    }

    if (selectedAvatarType === AvatarType.IMAGE && direct !== undefined) {
      const uploadFile = await getResource(attachment.helper.UploadFile)
      const file = new File([direct], 'avatar', { type: direct.type })

      result.avatar = await uploadFile(file)
    }
    return result
  }

  export async function removeAvatar (avatar: string) {
    if (!avatar.includes('://')) {
      const deleteFile = await getResource(attachment.helper.DeleteFile)
      await deleteFile(avatar)
    }
  }

  function handlePopupSubmit (
    submittedAvatarType: AvatarType,
    submittedAvatar: Ref<PlatformBlob> | undefined | null,
    submittedProps: Record<string, any> | undefined,
    submittedDirect?: Blob
  ) {
    selectedAvatarType = submittedAvatarType
    selectedAvatar = submittedAvatar
    selectedAvatarProps = submittedProps
    direct = submittedDirect
    dispatch('done')
  }
  const dispatch = createEventDispatcher()

  async function showSelectionPopup (e: MouseEvent) {
    console.log('showSelectionPopup', disabled)
    if (!disabled) {
      showPopup(SelectAvatarPopup, {
        avatar: selectedAvatar,
        selectedAvatarType,
        selectedAvatarProps,
        selectedAvatar,
        email,
        name,
        file: direct,
        icon,
        imageOnly,
        lessCrop,
        onSubmit: handlePopupSubmit
      })
    }
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="cursor-pointer" on:click|self={showSelectionPopup}>
  <AvatarComponent
    {direct}
    {size}
    {icon}
    person={{
      avatarType: selectedAvatarType,
      avatarProps: selectedAvatarProps,
      avatar: selectedAvatar
    }}
    {name}
  />
</div>
