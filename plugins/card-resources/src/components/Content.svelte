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
  import card, { Card } from '@hcengineering/card'
  import { BlobType } from '@hcengineering/core'
  import presentation, {
    deleteFile,
    FilePreview,
    getClient,
    getFileUrl,
    IconDownload
  } from '@hcengineering/presentation'
  import { getEventPositionElement, IconDelete, Menu, showPopup, type Action } from '@hcengineering/ui'
  import Description from './Description.svelte'
  import FilePlaceholder from './FilePlaceholder.svelte'

  export let doc: Card
  export let readonly: boolean = false
  export let content: HTMLElement
  export let showToc: boolean = true

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: isFile = hierarchy.isDerived(doc._class, card.types.File)

  async function showContextMenu (blob: BlobType, ev: MouseEvent) {
    ev.preventDefault()
    ev.stopPropagation()
    const actions: Action[] = [
      {
        label: presentation.string.Download,
        icon: IconDownload,
        action: async () => {
          const url = getFileUrl(blob.file, blob.name)
          const a = document.createElement('a')
          a.href = url
          a.download = blob.name
          a.target = '_blank'
          a.click()
        }
      }
    ]

    if (!readonly) {
      actions.push({
        label: presentation.string.Delete,
        icon: IconDelete,
        action: async () => {
          const blobs = { ...doc.blobs }
          const key = Object.keys(blobs).find((k) => blobs[k] === blob)
          if (key) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete blobs[key]
            await client.update(doc, { blobs })
            await deleteFile(blob.file)
          }
        }
      })
    }

    showPopup(Menu, { actions }, getEventPositionElement(ev))
  }
</script>

{#if isFile && Object.keys(doc.blobs ?? {}).length === 0 && !readonly}
  <FilePlaceholder {doc} />
{/if}

{#each Object.values(doc.blobs ?? {}) as blob}
  <FilePreview
    file={blob.file}
    contentType={blob.type}
    name={blob.name}
    metadata={blob.metadata}
    fit={blob.type !== 'application/pdf'}
    on:contextmenu={(ev) => showContextMenu(blob, ev)}
  />
{/each}

<Description {doc} {readonly} {showToc} bind:content minHeight="4rem" on:loaded on:headings />
