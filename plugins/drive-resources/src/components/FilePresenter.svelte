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
  import { File } from '@hcengineering/drive'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { FilePreviewPopup } from '@hcengineering/presentation'
  import { Icon, showPopup, tooltip } from '@hcengineering/ui'
  import { ObjectPresenterType } from '@hcengineering/view'
  import { DocNavLink, ObjectMention } from '@hcengineering/view-resources'

  import drive from '../plugin'

  export let value: WithLookup<File>
  export let inline: boolean = false
  export let disabled: boolean = false
  export let accent: boolean = false
  export let noUnderline: boolean = false
  export let shouldShowAvatar = true
  export let type: ObjectPresenterType = 'link'

  function handleClick (): void {
    if (disabled) {
      return
    }

    if (value.$lookup?.file === undefined) {
      return
    }

    const blob = value.$lookup?.file

    showPopup(
      FilePreviewPopup,
      {
        file: blob._id,
        contentType: blob.contentType,
        name: value.name,
        metadata: value.metadata
      },
      'float'
    )
  }
</script>

{#if value}
  {#if inline}
    <ObjectMention object={value} {disabled} {accent} {noUnderline} />
  {:else if type === 'link'}
    <DocNavLink object={value} onClick={handleClick} {disabled} {accent} {noUnderline}>
      <div class="flex-presenter" use:tooltip={{ label: getEmbeddedLabel(value.name) }}>
        {#if shouldShowAvatar}
          <div class="icon">
            <Icon icon={drive.icon.File} size={'small'} />
          </div>
        {/if}
        <span class="label nowrap" class:no-underline={noUnderline || disabled} class:fs-bold={accent}>
          {value.name}
        </span>
      </div>
    </DocNavLink>
  {:else if type === 'text'}
    <span class="overflow-label" use:tooltip={{ label: getEmbeddedLabel(value.name) }}>
      {value.name}
    </span>
  {/if}
{/if}
