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
  import { translate } from '@anticrm/platform'
  import { getClient } from '@anticrm/presentation'
  import type { Review } from '@anticrm/recruit'
  import recruit from '@anticrm/recruit'
  import { closeTooltip, Icon, showPanel } from '@anticrm/ui'
  import view from '@anticrm/view'

  export let value: Review
  export let inline: boolean = false

  const client = getClient()
  let shortLabel = ''

  const label = client.getHierarchy().getClass(value._class).shortLabel

  if (label !== undefined) {
    translate(label, {}).then(r => {
      shortLabel = r
    })
  }

  function show () {
    closeTooltip()
    showPanel(view.component.EditDoc, value._id, value._class, 'full')
  }
</script>

{#if value && shortLabel}
  <div class="flex-presenter" class:inline-presenter={inline} on:click={show}>
    <div class="icon">
      <Icon icon={recruit.icon.Application} size={'small'} />
    </div>
    <span class="label nowrap">{shortLabel}-{value.number}</span>
  </div>
{/if}
