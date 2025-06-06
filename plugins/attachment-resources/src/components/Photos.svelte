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
  import { Photo } from '@hcengineering/attachment'
  import { Class, Doc, Ref, Space, type WithLookup } from '@hcengineering/core'
  import { setPlatformStatus, unknownError } from '@hcengineering/platform'
  import { createQuery, getBlobRef, getClient, uploadFile } from '@hcengineering/presentation'
  import { Button, IconAdd, Label, Spinner } from '@hcengineering/ui'
  import attachment from '../plugin'
  import { showAttachmentPreviewPopup } from '../utils'
  import UploadDuo from './icons/UploadDuo.svelte'

  export let objectId: Ref<Doc>
  export let space: Ref<Space>
  export let _class: Ref<Class<Doc>>

  let inputFile: HTMLInputElement
  let loading = 0
  let images: WithLookup<Photo>[] = []

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

  async function create (file: File): Promise<void> {
    if (!file.type.startsWith('image/')) return
    loading++
    try {
      const uuid = await uploadFile(file)
      await client.addCollection(attachment.class.Photo, space, objectId, _class, 'attachments', {
        name: file.name,
        file: uuid,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      })
    } catch (err: any) {
      await setPlatformStatus(unknownError(err))
    } finally {
      loading--
    }
  }

  function fileSelected (): void {
    const list = inputFile.files
    if (list === null || list.length === 0) return
    for (let index = 0; index < list.length; index++) {
      const file = list.item(index)
      if (file !== null) {
        void create(file)
      }
    }
    inputFile.value = ''
  }

  function fileDrop (e: DragEvent): void {
    const list = e.dataTransfer?.files
    if (list === undefined || list.length === 0) return
    for (let index = 0; index < list.length; index++) {
      const file = list.item(index)
      if (file !== null) {
        void create(file)
      }
    }
  }

  let dragover = false

  function click (ev: Event, item?: WithLookup<Photo>): void {
    const el: HTMLElement = ev.currentTarget as HTMLElement
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    if (item !== undefined) {
      showAttachmentPreviewPopup(item)
    } else {
      inputFile.click()
    }
  }
</script>

<div class="antiSection">
  <div class="antiSection-header">
    <span class="antiSection-header__title">
      <Label label={attachment.string.Photos} />
    </span>
    {#if loading}
      <Spinner />
    {:else}
      <Button
        icon={IconAdd}
        kind={'ghost'}
        on:click={() => {
          inputFile.click()
        }}
      />
    {/if}
    <input
      bind:this={inputFile}
      disabled={inputFile == null}
      multiple
      type="file"
      name="file"
      accept="image/*"
      id="file"
      style="display: none"
      on:change={fileSelected}
    />
  </div>

  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="antiSection-empty attachments items mt-3"
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
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        class="item flex-center"
        on:click={(ev) => {
          click(ev, image)
        }}
      >
        {#await getBlobRef(image.file, image.name) then blobRef}
          <img src={blobRef.src} srcset={blobRef.srcset} alt={image.name} />
        {/await}
      </div>
    {/each}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="flex-center item new-item" on:click={click}>
      <UploadDuo size={'large'} />
    </div>
  </div>
</div>

<style lang="scss">
  .item {
    width: 5rem;
    min-width: 5rem;
    height: 5rem;
    color: var(--accent-color);
    border: 1px solid var(--dark-color);
    border-radius: 0.5rem;
    overflow: hidden;
    cursor: pointer;

    img {
      min-width: 5rem;
      min-height: 5rem;
    }
    &:not(:last-child) {
      margin-right: 0.625rem;
    }
  }

  .new-item {
    background: var(--accent-bg-color);
    border: 1px dashed var(--dark-color);
  }
</style>
