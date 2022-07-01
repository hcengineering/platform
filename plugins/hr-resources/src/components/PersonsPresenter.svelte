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
  import { Employee } from '@anticrm/contact'
  import { EmployeePresenter } from '@anticrm/contact-resources'
  import { WithLookup } from '@anticrm/core'
  import { Staff } from '@anticrm/hr'
  import hr from '../plugin'

  export let value: WithLookup<Staff> | WithLookup<Staff>[]
  export let inline: boolean = false

  let persons: WithLookup<Employee>[] = []
  $: persons = Array.isArray(value) ? value : [value]
</script>

{#if value}
  <div class="flex persons">
    {#each persons as p}
      <div class="ml-2 hover-trans">
        <EmployeePresenter
          value={p}
          shouldShowName={false}
          {inline}
          tooltipLabels={{
            personLabel: hr.string.TeamLeadTooltip,
            placeholderLabel: hr.string.AssignLead
          }}
        />
      </div>
    {/each}
  </div>
{/if}

<style lang="scss">
  .persons {
    display: grid;
    grid-template-columns: repeat(4, min-content);
    .icon {
      margin: 0.25rem;
    }
  }
</style>
