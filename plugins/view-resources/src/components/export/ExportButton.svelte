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
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { Button } from '@hcengineering/ui'
  import setting from '@hcengineering/setting'
  import { getMetadata } from '@hcengineering/platform'
  import presentation from '@hcengineering/presentation'

  export let _class: Ref<Class<Doc>>
  export let query: string = ''
  export let visible: boolean = false

  async function handleExport (): Promise<void> {
    try {
      const baseUrl = getMetadata(setting.metadata.ExportUrl)
      const token = getMetadata(presentation.metadata.Token)
      if (token == null) {
        throw new Error('No token available')
      }

      const res = await fetch(`${baseUrl}?format=csv&sync=true`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          _class,
          query
        })
      })

      if (!res.ok) {
        throw new Error('Export failed to start')
      }

      // Handle successful response with file download
      let filename = 'Talants.zip'
      // Try to extract filename from content-disposition header if available
      const contentDisposition = res.headers.get('content-disposition')
      if (contentDisposition !== null) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
        if (filenameMatch?.[1] !== undefined) {
          filename = filenameMatch[1]
        }
      }

      // Create a blob from the ReadableStream
      const blob = await res.blob()

      // Create a download link and trigger the download
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()

      // Clean up
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      console.log('Export downloaded successfully')
    } catch (err) {
      console.error('Export error:', err)
    }
  }
</script>

{#if visible}
  <Button
    icon={setting.icon.Export}
    label={'Export'}
    kind={'regular'}
    size={'medium'}
    showTooltip={{ label: 'Export' }}
    on:click={handleExport}
  />
{/if}
