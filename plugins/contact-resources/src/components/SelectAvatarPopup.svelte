<!--
// Copyright © 2022 Hardcore Engineering Inc.
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

  import { AvatarType, buildGravatarId, checkHasGravatar, getAvatarColorForId } from '@hcengineering/contact'
  import { Asset } from '@hcengineering/platform'
  import { AnySvelteComponent, Label, showPopup, TabList } from '@hcengineering/ui'

  import presentation, { Card, getFileUrl } from '@hcengineering/presentation'
  import contact from '../plugin'
  import { getAvatarTypeDropdownItems } from '../utils'
  import AvatarComponent from './Avatar.svelte'
  import EditAvatarPopup from './EditAvatarPopup.svelte'

  export let avatar: string | undefined
  export let email: string | undefined
  export let id: string
  export let file: Blob | undefined
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let onSubmit: (avatarType?: AvatarType, avatar?: string, file?: Blob) => void

  const [schema, uri] = avatar?.split('://') || []

  const initialSelectedType = (() => {
    if (file) {
      return AvatarType.IMAGE
    }
    if (!avatar) {
      return AvatarType.COLOR
    }

    return avatar.includes('://') ? (schema as AvatarType) : AvatarType.IMAGE
  })()

  const initialSelectedAvatar = (() => {
    if (!avatar) {
      return getAvatarColorForId(id)
    }

    return avatar.includes('://') ? uri : avatar
  })()

  let selectedAvatarType: AvatarType = initialSelectedType
  let selectedAvatar: string = initialSelectedAvatar
  let selectedFile: Blob | undefined = file

  let hasGravatar = false
  async function updateHasGravatar (email?: string) {
    hasGravatar = !!email && (await checkHasGravatar(buildGravatarId(email)))
  }
  $: updateHasGravatar(email)

  const dispatch = createEventDispatcher()

  function submit () {
    onSubmit(selectedAvatarType, selectedAvatar, selectedAvatarType === AvatarType.IMAGE ? selectedFile : undefined)
  }
  let inputRef: HTMLInputElement
  const targetMimes = ['image/png', 'image/jpg', 'image/jpeg']

  function handleDropdownSelection (e: any) {
    if (selectedAvatarType === AvatarType.GRAVATAR && email) {
      selectedAvatar = buildGravatarId(email)
    } else if (selectedAvatarType === AvatarType.IMAGE) {
      if (selectedFile) {
        return
      }
      if (file) {
        selectedFile = file
      } else if (avatar && !avatar.includes('://')) {
        selectedAvatar = avatar
      } else {
        selectedAvatar = ''
        inputRef.click()
      }
    } else {
      selectedAvatar = getAvatarColorForId(id)
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
        if (!selectedFile && (!avatar || avatar.includes('://'))) {
          selectedAvatarType = AvatarType.COLOR
          selectedAvatar = getAvatarColorForId(id)
        }
        return
      }
      if (blob === null) {
        selectedAvatarType = AvatarType.COLOR
        selectedAvatar = getAvatarColorForId(id)
        selectedFile = undefined
      } else {
        selectedFile = blob
        selectedAvatarType = AvatarType.IMAGE
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
        selectedAvatarType = AvatarType.COLOR
        selectedAvatar = getAvatarColorForId(id)
      }
    }
  }
</script>

<Card
  label={contact.string.SelectAvatar}
  okLabel={presentation.string.Save}
  width={'x-small'}
  accentHeader
  canSave={selectedAvatarType !== initialSelectedType ||
    selectedAvatar !== initialSelectedAvatar ||
    selectedFile !== file ||
    !avatar}
  okAction={submit}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <div class="flex-col-center gapV-4 mx-6">
    {#if selectedAvatarType === AvatarType.IMAGE}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="cursor-pointer" on:click|self={handleImageAvatarClick}>
        <AvatarComponent avatar={selectedAvatar} direct={selectedFile} size={'2x-large'} {icon} />
      </div>
    {:else}
      <AvatarComponent avatar={`${selectedAvatarType}://${selectedAvatar}`} size={'2x-large'} {icon} />
    {/if}
    <TabList
      items={getAvatarTypeDropdownItems(hasGravatar)}
      kind={'separated-free'}
      bind:selected={selectedAvatarType}
      on:select={handleDropdownSelection}
    />
  </div>
  <svelte:fragment slot="footer">
    {#if selectedAvatarType === AvatarType.GRAVATAR}
      <div class="flex-col">
        <Label label={contact.string.GravatarsManaged} />
        <span class="inline-flex clear-mins">
          <Label label={contact.string.Through} />
          <a target="”_blank”" class="ml-1" href="//gravatar.com">Gravatar.com</a>
        </span>
      </div>
    {/if}
    <input
      style="display: none;"
      type="file"
      bind:this={inputRef}
      on:change={onSelectFile}
      on:click={() => (document.body.onfocus = handleFileSelectionCancel)}
      accept={targetMimes.join(',')}
    />
  </svelte:fragment>
</Card>
