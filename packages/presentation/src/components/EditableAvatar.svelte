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
  import { showPopup } from '@anticrm/ui'

  import Avatar from './Avatar.svelte'
  import EditAvatarPopup from './EditAvatarPopup.svelte'
  import { getFileUrl } from '../utils'

  export let avatar: string | null | undefined = undefined
  export let size: 'x-small' | 'small' | 'medium' | 'large' | 'x-large'
  export let direct: Blob | undefined = undefined

  const dispatch = createEventDispatcher()

  let inputRef: HTMLInputElement
  const targetMimes = ['image/png', 'image/jpg', 'image/jpeg']
  async function onClick () {
    let file: Blob
    if (direct !== undefined) {
      file = direct
    } else if (avatar != null) {
      const url = getFileUrl(avatar)
      file = await (await fetch(url)).blob()
    } else {
      return inputRef.click()
    }
    showPopup(EditAvatarPopup, { file }, undefined, (blob) => {
      if (blob === undefined) {
        return
      }
      if (blob === null) {
        direct = undefined
        dispatch('remove')
      } else {
        direct = blob
        dispatch('done', { file: new File([blob], 'avatar') })
      }
    })
  }

  function onSelect (e: any) {
    const file = e.target?.files[0] as File | undefined
    if (file === undefined || !targetMimes.includes(file.type)) {
      return
    }

    showPopup(EditAvatarPopup, { file }, undefined, (blob) => {
      if (blob === undefined) {
        return
      }
      if (blob === null) {
        direct = undefined
        dispatch('remove')
      } else {
        direct = blob
        dispatch('done', { file: new File([blob], file.name) })
      }
    })
    e.target.value = null
  }
</script>

<div class="cursor-pointer" on:click={onClick}>
  <Avatar {avatar} {direct} {size} />
  <input style="display: none;" type="file" bind:this={inputRef} on:change={onSelect} accept={targetMimes.join(',')} />
</div>
