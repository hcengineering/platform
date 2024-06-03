<!--
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
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { Document } from '@hcengineering/controlled-documents'
  import { WithLookup } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { getPanelURI, tooltip } from '@hcengineering/ui'

  import DocumentIcon from '../../icons/DocumentIcon.svelte'
  import documents from '../../../plugin'

  export let value: WithLookup<Document> | undefined
  export let inline = false
  export let isGray = false
  export let isRegular = false
  export let withIcon = false
  export let withTitle = false
  export let disableLink = false
  export let editable = false

  $: documentCode = value !== undefined ? value.code : ''
  $: noUnderline = disableLink && !editable
  $: title = withTitle ? `${documentCode} ${value?.title}` : documentCode

  const dispatch = createEventDispatcher()

  function handleClick (event: MouseEvent): void {
    if (!editable) {
      return
    }

    dispatch('edit', event)
  }
</script>

{#if value}
  <a
    class="flex-presenter"
    href={!disableLink ? `#${getPanelURI(documents.component.EditDoc, value._id, value._class, 'content')}` : undefined}
    class:inline-presenter={inline}
    class:noBold={isRegular}
    class:no-underline={noUnderline}
    class:cursor-inherit={noUnderline}
    use:tooltip={{ label: getEmbeddedLabel(title) }}
    on:click={handleClick}
  >
    {#if withIcon}
      <div class="icon">
        <DocumentIcon size="small" />
      </div>
    {/if}
    <span class="label nowrap" class:no-underline={noUnderline} class:label-gray={isGray}>{title}</span>
  </a>
{/if}

<style lang="scss">
  .label-gray {
    color: var(--theme-halfcontent-color);
  }
</style>
