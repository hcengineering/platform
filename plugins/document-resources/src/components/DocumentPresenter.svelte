<!--
//
// Copyright © 2022, 2023 Hardcore Engineering Inc.
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
  import { Document } from '@hcengineering/document'
  import { tooltip } from '@hcengineering/ui'
  import { DocNavLink, ObjectMention } from '@hcengineering/view-resources'
  import { ObjectPresenterType } from '@hcengineering/view'

  import document from '../plugin'
  import DocumentIcon from './DocumentIcon.svelte'

  export let value: WithLookup<Document>
  export let inline: boolean = false
  export let disabled: boolean = false
  export let accent: boolean = false
  export let noUnderline: boolean = false
  export let breadcrumb: boolean = false
  export let maxWidth = ''
  export let shouldShowAvatar = true
  export let type: ObjectPresenterType = 'link'
</script>

{#if value}
  {#if inline}
    <ObjectMention object={value} {disabled} component={document.component.EditDoc} />
  {:else if type === 'link'}
    <DocNavLink {disabled} object={value} {accent} {noUnderline} component={document.component.EditDoc}>
      <div
        class="flex-presenter"
        class:title={breadcrumb}
        style:max-width={maxWidth}
        use:tooltip={{ label: document.string.Document }}
      >
        {#if shouldShowAvatar}
          <div class="icon">
            <DocumentIcon {value} size={'small'} defaultIcon={document.icon.Document} />
          </div>
        {/if}
        <span class="label nowrap" class:no-underline={noUnderline || disabled} class:fs-bold={accent}>
          {value.title}
        </span>
      </div>
    </DocNavLink>
  {:else if type === 'text'}
    <span class="overflow-label" use:tooltip={{ label: document.string.Document }}>
      {value.title}
    </span>
  {/if}
{/if}
