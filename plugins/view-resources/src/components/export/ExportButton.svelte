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
  import { Button, showPopup } from '@hcengineering/ui'
  import setting from '@hcengineering/setting'
  import { getMetadata } from '@hcengineering/platform'
  import presentation, { MessageBox } from '@hcengineering/presentation'

  export let _class: Ref<Class<Doc>>
  export let query: string = ''
  export let visible: boolean = false
  export let config: Record<string, any> = {}

  async function handleExport (): Promise<void> {
    try {
      const baseUrl = getMetadata(setting.metadata.ExportUrl)
      const token = getMetadata(presentation.metadata.Token)
      if (token == null) {
        throw new Error('No token available')
      }

      const res = await fetch(`${baseUrl}/exportSync?format=csv`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          _class,
          query,
          attributesOnly: true,
          config
        })
      })

      if (!res.ok) {
        showPopup(MessageBox, {
          label: setting.string.ExportRequestFailed,
          kind: 'error',
          message: setting.string.ExportRequestFailedMessage
        })
      }

      // Handle successful response with file download
      const filename = `Talants_${new Date().toLocaleDateString()}_${new Date().toLocaleTimeString()}.csv`

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
      showPopup(MessageBox, {
        label: setting.string.ExportRequestFailed,
        kind: 'error',
        message: setting.string.ExportRequestFailedMessage
      })
    }
  }
</script>

{#if visible}
  <Button
    icon={setting.icon.Export}
    label={setting.string.Export}
    kind={'regular'}
    size={'medium'}
    showTooltip={{ label: setting.string.Export }}
    on:click={handleExport}
  />
{/if}
