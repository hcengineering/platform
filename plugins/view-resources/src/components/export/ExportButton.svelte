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
      const exportUrl = 'http://localhost:4009/export' // todo: add export url
      const token = getMetadata(presentation.metadata.Token)
      if (token == null) {
        throw new Error('No token available')
      }

      const res = await fetch(`${exportUrl}?class=${_class}&type=csv`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          attributesOnly: false
        })
      })

      if (!res.ok) {
        throw new Error('Export failed to start')
      }

      console.log('Export started')
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
