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
  import type { Channel } from '@anticrm/contact'
  import ChannelsView from './ChannelsView.svelte'
  import { showPanel } from '@anticrm/ui'
  import view from '@anticrm/view'

  export let value: Channel[] | Channel | null

  function click (ev: any) {
    if (ev.detail.presenter !== undefined && Array.isArray(value)) {
      const channel = value[0]
      if (channel !== undefined) {
        showPanel(
          view.component.EditDoc,
          channel.attachedTo,
          channel.attachedToClass,
          'full',
          ev.detail.presenter
        )
      }
    }
  }
</script>

<ChannelsView {value} size={'small'} reverse on:click={click} />
