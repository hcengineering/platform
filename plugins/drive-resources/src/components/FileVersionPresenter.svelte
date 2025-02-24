<!--
//
// Copyright © 2024 Hardcore Engineering Inc.
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
//
-->
<script lang="ts">
  import { WithLookup } from '@hcengineering/core'
  import { type FileVersion } from '@hcengineering/drive'
  import { FilePreviewPopup } from '@hcengineering/presentation'
  import { showPopup } from '@hcengineering/ui'
  import { ObjectPresenterType } from '@hcengineering/view'
  import { DocNavLink, ObjectMention } from '@hcengineering/view-resources'

  import { formatFileVersion } from '../utils'

  export let value: WithLookup<FileVersion>
  export let inline: boolean = false
  export let disabled: boolean = false
  export let accent: boolean = false
  export let noUnderline: boolean = false
  export let type: ObjectPresenterType = 'link'

  $: version = formatFileVersion(value.version)

  function handleClick (): void {
    if (disabled) {
      return
    }

    showPopup(
      FilePreviewPopup,
      {
        file: value.file,
        contentType: value.type,
        name: value.title,
        metadata: value.metadata
      },
      'centered'
    )
  }
</script>

{#if value}
  {#if inline}
    <ObjectMention object={value} {disabled} {accent} {noUnderline} />
  {:else if type === 'link'}
    <DocNavLink object={value} onClick={handleClick} {disabled} {accent} {noUnderline}>
      <div class="flex-presenter">
        <div class="label nowrap flex flex-gap-2" class:no-underline={noUnderline || disabled} class:fs-bold={accent}>
          {version}
        </div>
      </div>
    </DocNavLink>
  {:else if type === 'text'}
    <span class="overflow-label">{version}</span>
  {/if}
{/if}
