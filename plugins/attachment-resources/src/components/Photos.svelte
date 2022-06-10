<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
  import { Photo } from '@anticrm/attachment'
  import { Class, Doc, Ref, Space } from '@anticrm/core'
  import { setPlatformStatus, unknownError } from '@anticrm/platform'
  import { createQuery, getClient, getFileUrl, PDFViewer } from '@anticrm/presentation'
  import { CircleButton, IconAdd, Label, showPopup, Spinner } from '@anticrm/ui'
  import attachment from '../plugin'
  import { uploadFile } from '../utils'
  import UploadDuo from './icons/UploadDuo.svelte'

  export let objectId: Ref<Doc>
  export let space: Ref<Space>
  export let _class: Ref<Class<Doc>>

  let inputFile: HTMLInputElement
  let loading = 0
  let images: Photo[] = []

  const client = getClient()
  const query = createQuery()
  query.query(
    attachment.class.Photo,
    {
      attachedTo: objectId
    },
    (res) => {
      images = res
    }
  )

  async function create (file: File) {
    if (!file.type.startsWith('image/')) return
    loading++
    try {
      const uuid = await uploadFile(file, { space, attachedTo: objectId })
      client.addCollection(attachment.class.Photo, space, objectId, _class, 'photos', {
        name: file.name,
        file: uuid,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      })
    } catch (err: any) {
      setPlatformStatus(unknownError(err))
    } finally {
      loading--
    }
  }

  function fileSelected () {
    const list = inputFile.files
    if (list === null || list.length === 0) return
    for (let index = 0; index < list.length; index++) {
      const file = list.item(index)
      if (file !== null) create(file)
    }
    inputFile.value = ''
  }

  function fileDrop (e: DragEvent) {
    const list = e.dataTransfer?.files
    if (list === undefined || list.length === 0) return
    for (let index = 0; index < list.length; index++) {
      const file = list.item(index)
      if (file !== null) create(file)
    }
  }

  let dragover = false

  function click (ev: Event, item?: Photo): void {
    const el: HTMLElement = ev.currentTarget as HTMLElement
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    if (item !== undefined) {
      showPopup(PDFViewer, { file: item.file, name: item.name, contentType: item.type }, 'float')
    } else {
      inputFile.click()
    }
  }
</script>

<div class="attachments-container">
  <div class="flex-row-center">
    <span class="title"><Label label={attachment.string.Photos} /></span>
    {#if loading}
      <Spinner />
    {:else}
      <CircleButton
        icon={IconAdd}
        size={'small'}
        selected
        on:click={() => {
          inputFile.click()
        }}
      />
    {/if}
    <input
      bind:this={inputFile}
      multiple
      type="file"
      name="file"
      accept="image/*"
      id="file"
      style="display: none"
      on:change={fileSelected}
    />
  </div>

  <div
    class="flex-row-center mt-5 zone-container"
    class:solid={dragover}
    on:dragover|preventDefault={() => {
      dragover = true
    }}
    on:dragleave={() => {
      dragover = false
    }}
    on:drop|preventDefault|stopPropagation={fileDrop}
  >
    {#each images as image (image._id)}
      <div
        class="item flex-center"
        on:click={(ev) => {
          click(ev, image)
        }}
      >
        <img src={getFileUrl(image.file)} alt={image.name} />
      </div>
    {/each}
    <div class="flex-center item new-item" on:click={click}>
      <UploadDuo size={'large'} />
    </div>
  </div>
</div>

<style lang="scss">
  .attachments-container {
    display: flex;
    flex-direction: column;

    .title {
      margin-right: 0.75rem;
      font-weight: 500;
      font-size: 1.25rem;
      color: var(--theme-caption-color);
    }
  }

  .zone-container {
    padding: 1rem;
    color: var(--theme-caption-color);
    background: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-bg-focused-color);
    border-radius: 0.75rem;
    overflow-x: auto;

    .item {
      width: 5rem;
      min-width: 5rem;
      height: 5rem;
      border-radius: 0.5rem;
      overflow: hidden;
      cursor: pointer;

      img {
        min-width: 5rem;
        min-height: 5rem;
      }
    }

    .item + .item {
      margin-left: 0.625rem;
    }

    .new-item {
      background: var(--theme-bg-accent-color);
      border: 1px dashed var(--theme-zone-border-lite);
    }
  }
</style>
