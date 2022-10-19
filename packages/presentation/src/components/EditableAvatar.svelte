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
  import { getResource } from '@hcengineering/platform'
  import { AnySvelteComponent, IconSize, showPopup } from '@hcengineering/ui'
  import contact, { AvatarType } from '@hcengineering/contact'
  import { Asset, getResource } from '@hcengineering/platform'
  import view from '@hcengineering/view'
  import {
    Action,
    AnySvelteComponent,
    getEventPositionElement,
    IconSize,
    Menu,
    showPopup
  } from '@hcengineering/ui'

  import Avatar from './Avatar.svelte'
  import EditAvatarPopup from './EditAvatarPopup.svelte'
  import { getFileUrl } from '../utils'
  import { buildGravatarId } from '../gravatar'

  export let avatar: string | null | undefined = undefined
  export let avatarType: AvatarType | undefined = undefined
  export let email: string | undefined = undefined
  export let size: IconSize
  export let direct: Blob | undefined = undefined
  export let icon: Asset | AnySvelteComponent | undefined = undefined

  let selectedAvatarType: AvatarType | undefined = undefined
  let selectedAvatar: string | undefined = undefined

  export async function createAvatar (): Promise<string | undefined> {
    if (selectedAvatarType === 'file' && direct !== undefined) {
      const uploadFile = await getResource(attachment.helper.UploadFile)
      const file = new File([direct], 'avatar')
      return uploadFile(file)
    } else if (selectedAvatarType == 'gravatar' && selectedAvatar !== undefined) {
      return Promise.resolve(selectedAvatar)
    }
    return undefined
  }

  export async function removeAvatar (avatar: string | null | undefined, avatarType: AvatarType | undefined) {
    if (avatar === null || avatar === undefined) return

    if (avatarType === 'file') {
      const deleteFile = await getResource(attachment.helper.DeleteFile)
      await deleteFile(avatar)
    } else if (avatarType === 'gravatar') {
      // do nothing
    }
  }

  function showCropper(file: Blob) {
    showPopup(EditAvatarPopup, { file }, undefined, (blob) => {
      if (blob === undefined) {
        return
      }
      if (blob === null) {
        onRemoveAvatar()
      } else {
        direct = blob
        selectedAvatarType = 'file'
        dispatch('done', { file: new File([blob], 'avatar'), avatarType: 'file' })
      }
    })
  }

  const dispatch = createEventDispatcher()

  let inputRef: HTMLInputElement
  const targetMimes = ['image/png', 'image/jpg', 'image/jpeg']

  function onSelectFile (e: any) {
    const file = e.target?.files[0] as File | undefined
    if (file === undefined || !targetMimes.includes(file.type)) {
      return
    }

    showCropper(file)
    e.target.value = null
  }

  const onUseFileAvatar = async (): Promise<void> => {
    let file: Blob
    if (direct !== undefined) {
      file = direct
    } else if (avatar != null) {
      const url = getFileUrl(avatar, 'full')
      file = await (await fetch(url)).blob()
    } else {
      return inputRef.click()
    }
    showCropper(file)
  }

  const onUseGravatar = async (): Promise<void> => {
    if (email === undefined) return
    selectedAvatar = buildGravatarId(email)
    selectedAvatarType = 'gravatar'
    direct = undefined
    dispatch('done', { avatarType: 'gravatar' })
  }

  const onRemoveAvatar = async (): Promise<void> => {
    selectedAvatar = undefined
    selectedAvatarType = undefined
    direct = undefined
    dispatch('remove')
  }

  const useGravatarAction: Action[] = [
    {
      action: onUseGravatar,
      icon: contact.icon.ContactApplication,
      label: contact.string.UseGravatar,
    }
  ]
  const removeAvatarAction: Action[] = [
    {
      action: onRemoveAvatar,
      icon: view.icon.Delete,
      label: contact.string.RemoveAvatar,
      group: '1'
    }
  ]

  $: hasAvatar = avatar !== null && avatar !== undefined
  $: hasEmail = email !== undefined

  let actions: Action[] = []
  $: {
    actions = [
      {
        action: onUseFileAvatar,
        icon: contact.icon.ContactApplication,
        label: contact.string.UploadPhoto,
      },
      ...(hasEmail ? useGravatarAction: []),
      ...(hasAvatar ? removeAvatarAction : [])
    ]
  }

  async function showMenu (e: MouseEvent) {
    showPopup(Menu, { actions }, getEventPositionElement(e), () => {})
  }
</script>

<div class="cursor-pointer" on:click|self={showMenu}>
  {#if selectedAvatar && selectedAvatarType}
    <Avatar avatar={selectedAvatar} avatarType={selectedAvatarType} {direct} {size} {icon} />
  {:else}
    <Avatar {avatar} {avatarType} {direct} {size} {icon} />
  {/if}
  <input style="display: none;" type="file" bind:this={inputRef} on:change={onSelectFile} accept={targetMimes.join(',')} />
</div>
