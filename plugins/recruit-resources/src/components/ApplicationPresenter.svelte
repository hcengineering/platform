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
  import { getClient } from '@hcengineering/presentation'
  import type { Applicant } from '@hcengineering/recruit'
  import recruit from '@hcengineering/recruit'
  import recruitPlg from '../plugin'
  import { Icon, tooltip } from '@hcengineering/ui'
  import { DocNavLink } from '@hcengineering/view-resources'

  export let value: Applicant
  export let inline: boolean = false
  export let disabled: boolean = false
  export let noUnderline: boolean = false
  export let accent: boolean = false

  const client = getClient()
  const shortLabel = value && client.getHierarchy().getClass(value._class).shortLabel
</script>

{#if value && shortLabel}
  <DocNavLink object={value} {inline} {disabled} {noUnderline} {accent}>
    {#if inline}
      <span class="antiMention" use:tooltip={{ label: recruitPlg.string.Application }}>
        @{#if shortLabel}{shortLabel}-{/if}{value.number}
      </span>
    {:else}
      <div class="flex-presenter">
        <div class="icon">
          <Icon icon={recruit.icon.Application} size={'small'} />
        </div>
        <span class="label nowrap" class:no-underline={noUnderline || disabled} class:fs-bold={accent}>
          {#if shortLabel}{shortLabel}-{/if}{value.number}
        </span>
      </div>
    {/if}
  </DocNavLink>
{/if}
