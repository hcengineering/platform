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

  import MD5 from 'crypto-js/md5'

  import { AvatarType, checkHasGravatar, type AvatarInfo } from '@hcengineering/contact'
  import type { Ref } from '@hcengineering/core'
  import { Blob as PlatformBlob } from '@hcengineering/core'
  import { Asset } from '@hcengineering/platform'
  import presentation, { Card, getFileUrl } from '@hcengineering/presentation'
  import {
    AnySvelteComponent,
    ColorDefinition,
    Label,
    TabList,
    eventToHTMLElement,
    getPlatformAvatarColorByName,
    getPlatformAvatarColorForTextDef,
    getPlatformAvatarColors,
    showPopup,
    themeStore
  } from '@hcengineering/ui'
  import { ColorsPopup } from '@hcengineering/view-resources'
  import contact from '../plugin'
  import { getAvatarTypeDropdownItems } from '../utils'
  import AvatarComponent from './Avatar.svelte'
  import EditAvatarPopup from './EditAvatarPopup.svelte'

  function buildGravatarId (email: string): string {
    return MD5(email.trim().toLowerCase()).toString()
  }

  export let selectedAvatarType: AvatarType
  export let selectedAvatar: AvatarInfo['avatar']
  export let selectedAvatarProps: AvatarInfo['avatarProps']

  const initialSelectedAvatarType = selectedAvatarType
  const initialSelectedAvatar = selectedAvatar
  const initialSelectedAvatarProps = { ...selectedAvatarProps }

  export let name: string | null | undefined = undefined
  export let email: string | undefined
  export let file: Blob | undefined
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let imageOnly: boolean = false
  export let lessCrop: boolean = false
  export let onSubmit: (
    submittedAvatarType: AvatarType,
    submittedAvatar: Ref<PlatformBlob> | undefined | null,
    submittedProps: Record<string, any> | undefined,
    submittedDirect?: Blob
  ) => void

  const colors = getPlatformAvatarColors($themeStore.dark)
  let color: ColorDefinition | undefined =
    (selectedAvatarType as AvatarType) === AvatarType.COLOR
      ? getPlatformAvatarColorByName(selectedAvatarProps?.color ?? '', $themeStore.dark)
      : undefined

  let selectedFile: Blob | undefined = file

  let hasGravatar = false
  async function updateHasGravatar (email?: string) {
    hasGravatar = !!email && (await checkHasGravatar(buildGravatarId(email)))
  }
  $: updateHasGravatar(email)

  const dispatch = createEventDispatcher()

  function submit () {
    onSubmit(
      selectedAvatarType,
      selectedAvatar,
      selectedAvatarProps,
      selectedAvatarType === AvatarType.IMAGE ? selectedFile : undefined
    )
  }
  let inputRef: HTMLInputElement
  const targetMimes = ['image/png', 'image/jpg', 'image/jpeg']

  function handleDropdownSelection (e: any) {
    if (selectedAvatarType === AvatarType.GRAVATAR && email) {
      selectedAvatarProps = { url: buildGravatarId(email) }
    } else if (selectedAvatarType === AvatarType.IMAGE) {
      if (selectedFile) {
        return
      }
      if (file) {
        selectedFile = file
      } else {
        selectedAvatar = undefined
        inputRef.click()
      }
    } else {
      selectedAvatarProps = {
        color: color ? color.name : getPlatformAvatarColorForTextDef(name ?? '', $themeStore.dark).name
      }
    }
  }

  async function handleImageAvatarClick (): Promise<void> {
    let editableFile: Blob

    if (selectedFile !== undefined) {
      editableFile = selectedFile
    } else if (selectedAvatar && !(imageOnly && selectedAvatar === initialSelectedAvatar)) {
      const url = getFileUrl(selectedAvatar)
      editableFile = await (await fetch(url)).blob()
    } else {
      inputRef.click()
      return
    }
    if (editableFile.size > 0) showCropper(editableFile)
  }

  function showCropper (editableFile: Blob): void {
    showPopup(EditAvatarPopup, { file: editableFile, lessCrop }, undefined, (blob) => {
      if (blob === undefined) {
        if (!selectedFile && !initialSelectedAvatar) {
          selectedAvatarType = AvatarType.COLOR
          selectedAvatarProps = { color: getPlatformAvatarColorForTextDef(name ?? '', $themeStore.dark).name }
        }
        return
      }
      if (blob === null) {
        selectedAvatarType = AvatarType.COLOR
        selectedAvatar = undefined
        selectedAvatarProps = {
          color: imageOnly ? '' : getPlatformAvatarColorForTextDef(name ?? '', $themeStore.dark).name
        }
        selectedFile = undefined
      } else {
        selectedFile = blob
        selectedAvatarType = AvatarType.IMAGE
      }
    })
  }

  function onSelectFile (e: any): void {
    const targetFile = e.target?.files[0] as File | undefined

    if (targetFile === undefined || !targetMimes.includes(targetFile.type)) {
      return
    }
    showCropper(targetFile)
    e.target.value = null
    document.body.onfocus = null
  }

  function handleFileSelectionCancel (): void {
    document.body.onfocus = null

    if (!inputRef.value.length) {
      if (!selectedFile) {
        selectedAvatarType = AvatarType.COLOR
        selectedAvatar = undefined
        selectedAvatarProps = { color: getPlatformAvatarColorForTextDef(name ?? '', $themeStore.dark).name }
      }
    }
  }

  const showColorPopup = (event: MouseEvent) => {
    showPopup(
      ColorsPopup,
      {
        colors,
        columns: 6,
        selected: getPlatformAvatarColorByName(selectedAvatarProps?.color ?? '', $themeStore.dark),
        key: 'icon'
      },
      eventToHTMLElement(event),
      (col) => {
        if (col != null) {
          color = colors[col]
          selectedAvatarProps = { color: color.name }
        }
      }
    )
  }
</script>

<Card
  label={contact.string.SelectAvatar}
  okLabel={presentation.string.Save}
  width={'x-small'}
  accentHeader
  canSave={selectedAvatarType !== initialSelectedAvatarType ||
    selectedAvatar !== initialSelectedAvatar ||
    JSON.stringify(initialSelectedAvatarProps) !== JSON.stringify(selectedAvatarProps) ||
    selectedFile !== file}
  okAction={submit}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <div class="flex-col-center gapV-4 mx-6">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="cursor-pointer"
      on:click|self={(e) => {
        if (imageOnly) {
          handleImageAvatarClick()
        } else {
          if (selectedAvatarType === AvatarType.IMAGE) handleImageAvatarClick()
          else if (selectedAvatarType === AvatarType.COLOR) showColorPopup(e)
        }
      }}
    >
      <AvatarComponent
        person={{
          avatarType: selectedAvatarType,
          avatar: selectedAvatar,
          avatarProps: selectedAvatarProps
        }}
        direct={selectedAvatarType === AvatarType.IMAGE ? selectedFile : undefined}
        size={'2x-large'}
        {icon}
        {name}
      />
    </div>
    <TabList
      items={getAvatarTypeDropdownItems(hasGravatar, imageOnly)}
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
