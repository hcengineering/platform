<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Icon, IconDPCalendar, Label, areDatesEqual, getMonthName } from '@hcengineering/ui'
  import view from '../../plugin'
  export let value: Date

  const today: Date = new Date(Date.now())
</script>

<div class="container">
  {#if areDatesEqual(today, value)}
    <Label label={view.string.Today} />
  {:else}
    <div class="btn-icon">
      <Icon icon={IconDPCalendar} size="full" />
    </div>
    {value.getDate()}
    {getMonthName(value, 'short')}
    {#if value.getFullYear() !== today.getFullYear()}
      {value.getFullYear()}
    {/if}
  {/if}
</div>

<style lang="scss">
  .container {
    position: relative;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    font-weight: 400;
    width: auto;
    min-width: 0;
    white-space: nowrap;
    justify-content: flex-start;

    .btn-icon {
      margin-right: 0.375rem;
      width: 0.875rem;
      height: 0.875rem;
      transition: color 0.15s;
      pointer-events: none;
    }
  }
</style>
