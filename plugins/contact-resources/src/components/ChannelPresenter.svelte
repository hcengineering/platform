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
  import { Channel } from '@hcengineering/contact'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { ButtonSize, CircleButton, tooltip } from '@hcengineering/ui'
  import { channelProviders } from '../utils'

  export let value: Channel
  export let size: ButtonSize = 'small'
  $: provider = $channelProviders.find((it) => it._id === value.provider)
</script>

<div class="flex-row-center" use:tooltip={{ label: getEmbeddedLabel(value.value) }}>
  {#if provider}
    <CircleButton icon={provider.icon} {size} />
    <div class="overflow-label ml-2">{value.value}</div>
  {/if}
</div>
