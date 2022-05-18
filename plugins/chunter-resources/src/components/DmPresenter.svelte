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
  import type { DirectMessage } from '@anticrm/chunter'
  import { getClient } from '@anticrm/presentation'
  import { Icon } from '@anticrm/ui'

  import { getSpaceLink, getDmName } from '../utils'

  export let value: DirectMessage
  const client = getClient()

  $: icon = client.getHierarchy().getClass(value._class).icon
  $: link = getSpaceLink(value._id)
</script>

{#if value}
  {#await getDmName(client, value) then name}
    <a class="flex-presenter" href={link}>
      <div class="icon">
        {#if icon}
          <Icon {icon} size={'small'} />
        {/if}
      </div>
      <span class="label">{name}</span>
    </a>
  {/await}
{/if}
