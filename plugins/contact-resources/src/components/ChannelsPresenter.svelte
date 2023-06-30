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
  import type { Channel } from '@hcengineering/contact'
  import { getResource } from '@hcengineering/platform'
  import type { ButtonKind, ButtonSize } from '@hcengineering/ui'
  import { showPopup } from '@hcengineering/ui'
  import { ViewAction } from '@hcengineering/view'
  import ChannelsDropdown from './ChannelsDropdown.svelte'

  export let value: Channel[] | Channel | null

  export let editable: boolean | undefined = undefined
  export let kind: ButtonKind = 'link-bordered'
  export let size: ButtonSize = 'small'
  export let length: 'tiny' | 'short' | 'full' = 'short'
  export let shape: 'circle' | undefined = 'circle'

  async function _open (ev: CustomEvent): Promise<void> {
    if (ev.detail.presenter !== undefined && Array.isArray(value)) {
      showPopup(ev.detail.presenter, { channel: ev.detail.channel }, 'float')
    }
    if (ev.detail.action !== undefined && Array.isArray(value)) {
      const action = await getResource(ev.detail.action as ViewAction)
      const channel = value.find((it) => it.value === ev.detail.value)
      if (action != null && channel != null) {
        action(channel, ev)
      }
    }
  }
</script>

{#if value}
  <ChannelsDropdown bind:value {length} {kind} {size} {shape} {editable} on:open={_open} />
{/if}
