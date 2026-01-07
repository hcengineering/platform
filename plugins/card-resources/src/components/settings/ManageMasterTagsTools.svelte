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
  import { clearSettingsStore } from '@hcengineering/setting-resources'
  import {
    ButtonIcon,
    getCurrentResolvedLocation,
    IconAdd,
    IconAttachment,
    navigate,
    showPopup
  } from '@hcengineering/ui'
  import card from '../../plugin'
  import CreateTag from '../CreateTag.svelte'

  function handleAdd (): void {
    showPopup(
      CreateTag,
      {
        parent: undefined,
        _class: card.class.MasterTag
      },
      undefined,
      (res) => {
        if (res != null) {
          clearSettingsStore()
          const loc = getCurrentResolvedLocation()
          loc.path[3] = 'types'
          loc.path[4] = res
          loc.path.length = 5
          navigate(loc)
        }
      }
    )
  }

  async function handleImprot (): Promise<void> {
    const { importModule } = await import('../../exporter')
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement
      if (target.files && target.files.length > 0) {
        const file = target.files[0]
        const reader = new FileReader()
        reader.onload = async (event: ProgressEvent<FileReader>) => {
          if (event.target?.result !== undefined && typeof event.target.result === 'string') {
            try {
              await importModule(event.target.result)
            } catch (err: any) {
              console.error('Failed to import module:', err)
            }
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }
</script>

<ButtonIcon
  id={'new-master-tag'}
  icon={IconAttachment}
  tooltip={{ label: card.string.Import }}
  kind={'tertiary'}
  size={'extra-small'}
  on:click={handleImprot}
/>
<ButtonIcon id={'new-master-tag'} icon={IconAdd} kind={'tertiary'} size={'extra-small'} on:click={handleAdd} />
