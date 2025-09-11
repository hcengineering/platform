
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
  import { ModernButton } from '@hcengineering/ui'
  import { Employee } from '@hcengineering/contact'
  import { sendInvite } from '../../../meetingController'
  import love from '../../../plugin'

  export let employee: Employee
  export let kind: 'primary' | 'secondary' | 'tertiary' | 'negative' = 'secondary'
  export let type: 'type-button' | 'type-button-icon' = 'type-button'

  async function invite(): Promise<void> {
    await sendInvite(employee._id)
  }
</script>

<div class="button-container">
  <ModernButton
    label={type === 'type-button-icon' ? undefined : love.string.Invite}
    icon={love.icon.Invite}
    size="small"
    iconSize="small"
    {type}
    {kind}
    on:click={invite}
  />
</div>

<style lang="scss">
  .button-container {
    border-radius: var(--small-BorderRadius);
    display: flex;
    background-color: var(--theme-button-container-color);
  }
</style>

