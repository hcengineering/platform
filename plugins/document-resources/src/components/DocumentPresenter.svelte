<!--
//
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { tooltip, Icon } from '@hcengineering/ui'
  import { DocNavLink } from '@hcengineering/view-resources'
  import document from '../plugin'

  export let value: WithLookup<Document>
  export let inline: boolean = false
  export let disabled: boolean = false
  export let accent: boolean = false
</script>

{#if value}
  <DocNavLink {disabled} object={value} {inline} {accent} noUnderline={disabled} component={document.component.EditDoc}>
    {#if inline}
      <span class="antiMention" use:tooltip={{ label: document.string.Document }}>
        @{value.name}-{value.version}
      </span>
    {:else}
      <div class="icon">
        <Icon icon={document.icon.Document} size={'small'} />
      </div>
      <span class="label nowrap" class:no-underline={disabled} class:fs-bold={accent}>{value.name}-{value.version}</span
      >
    {/if}
  </DocNavLink>
{/if}
