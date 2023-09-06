<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { Organization } from '@hcengineering/contact'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { tooltip } from '@hcengineering/ui'
  import { DocNavLink } from '@hcengineering/view-resources'
  import Company from './icons/Company.svelte'

  export let value: Organization
  export let inline: boolean = false
  export let disabled: boolean = false
  export let accent: boolean = false
  export let noUnderline: boolean = false
  export let maxWidth = ''
</script>

{#if value}
  <DocNavLink {disabled} {inline} object={value} {accent} {noUnderline}>
    {#if inline}
      <span class="antiMention" use:tooltip={{ label: getEmbeddedLabel(value.name) }}>
        @{value.name}
      </span>
    {:else}
      <div class="flex-presenter" style:max-width={maxWidth} use:tooltip={{ label: getEmbeddedLabel(value.name) }}>
        <div class="icon circle"><Company size={'small'} /></div>
        <span class="overflow-label label" class:no-underline={noUnderline || disabled} class:fs-bold={accent}
          >{value.name}</span
        >
      </div>
    {/if}
  </DocNavLink>
{/if}
