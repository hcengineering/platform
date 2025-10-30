<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { Button } from '@hcengineering/ui'
  import billing from '../plugin'
  import { upgradePlan } from '../utils'

  export let label: string = 'Upgrade Plan'
  export let disabled: boolean = false
  export let size: 'medium' | 'small' = 'small'

  function handleClick (): void {
    if (!disabled) {
      upgradePlan()
    }
  }
</script>

<div class="px-2">
  <Button
    label={billing.string.UpgradePlan}
    showTooltip={{
      label: billing.string.LimitReached
    }}
    kind="attention"
    {size}
    {disabled}
    on:click={handleClick}
  />
</div>
