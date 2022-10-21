<!--
// Copyright © 2022 Anticrm Platform Contributors.
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

  import { DropdownLabelsIntl, AnySvelteComponent, showPopup } from '@hcengineering/ui'
  import { AvatarType, Avatar } from '@hcengineering/contact'
  import { Asset } from '@hcengineering/platform'

  import presentation from '..'
  import { avatarTypeDropdownItems, getFileUrl } from '../utils'
  import { buildGravatarId } from '../gravatar'
  import Card from './Card.svelte'
  import AvatarComponent from './Avatar.svelte'
  import EditAvatarPopup from './EditAvatarPopup.svelte'

  export let avatar: Avatar | undefined
  export let email: string | undefined
  export let file: Blob | undefined
  export let icon: Asset | AnySvelteComponent | undefined
  export let onSubmit: (avatarType?: AvatarType, avatar?: string, file?: Blob) => void

  let selectedAvatarType: AvatarType | undefined = avatar?.type
  let selectedAvatar: string | undefined = avatar?.value
  let selectedFile: Blob | undefined = file

  const dispatch = createEventDispatcher()

  function submit () {
    onSubmit(selectedAvatarType, selectedAvatar, selectedAvatarType === 'image' ? selectedFile : undefined)
  }
  let inputRef: HTMLInputElement
  const targetMimes = ['image/png', 'image/jpg', 'image/jpeg']

  function handleDropdownSelection (e: any) {
    if (selectedAvatarType === 'gravatar' && email) {
      selectedAvatar = buildGravatarId(email)
    } else if (selectedAvatarType === 'image') {
      if (selectedFile) {
        return
      }
      if (file) {
        selectedFile = file
      } else if (avatar?.type === 'image') {
        selectedAvatar = avatar.value
      } else {
        inputRef.click()
      }
    }
  }

  async function handleImageAvatarClick () {
    let editableFile: Blob

    if (selectedFile !== undefined) {
      editableFile = selectedFile
    } else if (selectedAvatar) {
      const url = getFileUrl(selectedAvatar, 'full')
      editableFile = await (await fetch(url)).blob()
    } else {
      return inputRef.click()
    }
    showCropper(editableFile)
  }

  function showCropper (editableFile: Blob) {
    showPopup(EditAvatarPopup, { file: editableFile }, undefined, (blob) => {
      if (blob === undefined) {
        if (!selectedFile && avatar?.type !== 'image') {
          selectedAvatarType = 'gravatar'
        }
        return
      }
      if (blob === null) {
        selectedAvatarType = 'gravatar'
        selectedFile = undefined
      } else {
        selectedFile = blob
      }
    })
  }

  function onSelectFile (e: any) {
    const targetFile = e.target?.files[0] as File | undefined

    if (targetFile === undefined || !targetMimes.includes(targetFile.type)) {
      return
    }
    showCropper(targetFile)
    e.target.value = null
    document.body.onfocus = null
  }

  function handleFileSelectionCancel () {
    document.body.onfocus = null

    if (!inputRef.value.length) {
      if (!selectedFile) {
        selectedAvatarType = 'gravatar'
      }
    }
  }
</script>

<Card
  label={presentation.string.SelectAvatar}
  okLabel={presentation.string.Save}
  canSave={(() => selectedAvatarType !== avatar?.type || selectedAvatar !== avatar?.value || selectedFile !== file)()}
  okAction={submit}
  on:close={() => {
    dispatch('close')
  }}
>
  <DropdownLabelsIntl
    items={avatarTypeDropdownItems}
    label={presentation.string.SelectAvatar}
    bind:selected={selectedAvatarType}
    on:selected={handleDropdownSelection}
  />
  {#if selectedAvatarType === 'image'}
    <div class="cursor-pointer" on:click|self={handleImageAvatarClick}>
      <AvatarComponent
        avatar={selectedAvatar ? { type: selectedAvatarType, value: selectedAvatar } : null}
        direct={selectedFile}
        size={'x-large'}
        {icon}
      />
    </div>
  {:else}
    <AvatarComponent
      avatar={selectedAvatarType && selectedAvatar ? { type: selectedAvatarType, value: selectedAvatar } : null}
      size={'x-large'}
      {icon}
    />
  {/if}
  <input
    style="display: none;"
    type="file"
    bind:this={inputRef}
    on:change={onSelectFile}
    on:click={() => (document.body.onfocus = handleFileSelectionCancel)}
    accept={targetMimes.join(',')}
  />
</Card>
