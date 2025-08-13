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
  import { tooltip } from '@hcengineering/ui'
  import { DocNavLink } from '@hcengineering/view-resources'

  import DocumentIcon from '../../icons/DocumentIcon.svelte'
  import documents from '../../../plugin'

  export let value: WithLookup<Document> | undefined
  export let inline = false
  export let isGray = false
  export let isRegular = false
  export let withIcon = false
  export let withTitle = false
  export let disableLink = false
  export let canEdit = false

  $: documentCode = value !== undefined ? value.code : ''
  $: noUnderline = disableLink && !canEdit
  $: disabled = disableLink && !canEdit
  $: title = withTitle ? `${documentCode} ${value?.title}` : documentCode

  const dispatch = createEventDispatcher()

  function handleClick (event: MouseEvent): void {
    if (!canEdit) {
      return
    }

    dispatch('edit', event)
  }
</script>

{#if value}
  <DocNavLink
    object={value}
    component={documents.component.EditDoc}
    onClick={canEdit ? handleClick : undefined}
    accent={!isRegular}
    {disabled}
    {noUnderline}
    {inline}
  >
    <div class="flex-presenter" use:tooltip={{ label: getEmbeddedLabel(title) }}>
      {#if withIcon}
        <div class="icon">
          <DocumentIcon size="small" />
        </div>
      {/if}
      <span class="label nowrap" class:fs-bold={!isRegular} class:no-underline={noUnderline} class:label-gray={isGray}
        >{title}</span
      >
    </div>
  </DocNavLink>
{/if}

<style lang="scss">
  .label-gray {
    color: var(--theme-halfcontent-color);
  }
</style>
