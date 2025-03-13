<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { Card } from '@hcengineering/card'
  import { getClient, getFileMetadata } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import { FileUploadCallbackParams, uploadFiles } from '@hcengineering/uploader'
  import UploadDuo from './icons/UploadDuo.svelte'

  export let doc: Card

  const client = getClient()

  let inputFile: HTMLInputElement
  let dragover = false

  async function onFileUploaded ({ uuid, name, file, type }: FileUploadCallbackParams): Promise<void> {
    const metadata = await getFileMetadata(file, uuid)
    const blobs = doc.blobs ?? {}
    blobs[uuid] = {
      name,
      type,
      metadata,
      file: uuid
    }
    await client.update(doc, {
      blobs
    })
  }

  async function fileSelected (): Promise<void> {
    const list = inputFile.files
    if (list === null || list.length === 0) return

    const options = {
      onFileUploaded,
      showProgress: {
        target: { objectId: doc._id, objectClass: doc._class }
      }
    }
    await uploadFiles(list, options)

    inputFile.value = ''
  }

  async function fileDrop (e: DragEvent): Promise<void> {
    dragover = false
    e.preventDefault()
    e.stopPropagation()

    const list = e.dataTransfer?.files
    if (list === undefined || list.length === 0) return

    const options = {
      onFileUploaded,
      showProgress: {
        target: { objectId: doc._id, objectClass: doc._class }
      }
    }
    await uploadFiles(list, options)
  }
</script>

<input
  bind:this={inputFile}
  disabled={inputFile == null}
  multiple
  type="file"
  name="file"
  id="file"
  style="display: none"
  on:change={fileSelected}
/>
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  on:dragover={(e) => {
    dragover = true
    e.preventDefault()
  }}
  on:dragleave={() => {
    dragover = false
  }}
  on:drop={fileDrop}
>
  <div class="antiSection-empty attachments flex-col mt-3" class:solid={dragover}>
    <div class="flex-center caption-color">
      <UploadDuo size={'large'} />
    </div>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="over-underline text-sm caption-color"
      style:pointer-events={dragover ? 'none' : 'all'}
      on:click={() => {
        inputFile.click()
      }}
    >
      <Label label={attachment.string.UploadDropFilesHere} />
    </div>
  </div>
</div>
