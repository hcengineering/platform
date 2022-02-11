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
  import { getClient } from '@anticrm/presentation'
  import type { Applicant } from '@anticrm/recruit'
  import recruit from '@anticrm/recruit'
  import { Icon } from '@anticrm/ui'
  import { showPanel } from '@anticrm/ui/src/panelup'
  import view from '@anticrm/view'

  export let value: Applicant

  const client = getClient()
  const shortLabel = client.getHierarchy().getClass(value._class).shortLabel

  function show () {
    showPanel(view.component.EditDoc, value._id, value._class, 'full')
  }
</script>

{#if value && shortLabel}
  <div class="sm-tool-icon" on:click={show}>
    <span class="icon"><Icon icon={recruit.icon.Application} size={'small'} /></span>&nbsp;{shortLabel}-{value.number}
  </div>
{/if}
