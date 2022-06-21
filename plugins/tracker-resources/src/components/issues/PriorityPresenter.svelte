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
  import { Asset, IntlString } from '@anticrm/platform'
  import { IssuePriority } from '@anticrm/tracker'
  import { Icon, Label } from '@anticrm/ui'
  import { issuePriorities } from '../../utils'

  export let value: IssuePriority | undefined

  let label: IntlString, icon: Asset
  $: if (value !== undefined) ({ label, icon } = issuePriorities[value])
</script>

{#if value !== undefined}
  <div class="flex-presenter">
    <div class="icon">
      <Icon {icon} size={'small'} />
    </div>
    <span class="overflow-label">
      <Label {label} />
    </span>
  </div>
{/if}
