<!--
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
-->
<script lang="ts">
  import { chunterId, DirectMessage } from '@hcengineering/chunter'
  import { getClient } from '@hcengineering/presentation'
  import { NavLink } from '@hcengineering/view-resources'
  import { ObjectPresenterType } from '@hcengineering/view'
  import { tooltip } from '@hcengineering/ui'
  import { getEmbeddedLabel } from '@hcengineering/platform'

  import { getDmName } from '../utils'
  import DirectIcon from './DirectIcon.svelte'

  export let value: DirectMessage
  export let disabled = false
  export let shouldShowAvatar = true
  export let type: ObjectPresenterType = 'link'

  const client = getClient()
</script>

{#if value}
  {#await getDmName(client, value) then name}
    {#if type === 'link'}
      <NavLink app={chunterId} space={value._id} {disabled}>
        <div class="flex-presenter">
          {#if shouldShowAvatar}
            <DirectIcon {value} />
          {/if}
          <span class="label">{name}</span>
        </div>
      </NavLink>
    {:else if type === 'text'}
      <span class="overflow-label" use:tooltip={{ label: getEmbeddedLabel(name) }}>{name}</span>
    {/if}
  {/await}
{/if}
