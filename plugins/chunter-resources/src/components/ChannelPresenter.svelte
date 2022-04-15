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
  import type { Channel } from '@anticrm/chunter'
  import { Ref, Space } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import { getCurrentLocation, Icon, locationToUrl } from '@anticrm/ui'
  import chunter from '../plugin'

  export let value: Channel
  const client = getClient()

  $: icon = client.getHierarchy().getClass(value._class).icon

  function getLink (id: Ref<Space>): string {
    const loc = getCurrentLocation()
    loc.path[1] = chunter.app.Chunter
    loc.path[2] = id
    loc.path.length = 3
    loc.fragment = undefined
    return locationToUrl(loc)
  }

  $: link = getLink(value._id)
</script>

{#if value}
  <a class="flex-presenter" href={link}>
    <div class="icon">
      {#if icon}
        <Icon {icon} size={'small'} />
      {/if}
    </div>
    <span class="label">{value.name}</span>
  </a>
{/if}
