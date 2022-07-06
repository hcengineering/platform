<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import type { IntlString } from '@anticrm/platform'
  import { getCurrentLocation, Label } from '@anticrm/ui'

  export let label: IntlString
  // export let action: () => Promise<void> | void

  const loc = getCurrentLocation()
</script>

<div class="antiNav-header">
  <div class="flex-row">
    <span class="fs-title overflow-label"><Label {label} /></span>
    <div>
      {loc.path[1]}
    </div>
  </div>
  <!-- <ActionIcon label={workbench.string.More} icon={IconMoreH} size={'small'} {action}/> -->
</div>
