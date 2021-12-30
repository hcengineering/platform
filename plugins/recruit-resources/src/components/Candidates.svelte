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

  import { EditWithIcon, Icon, IconSearch, Label, ScrollBox } from '@anticrm/ui'

  import { Table } from '@anticrm/view-resources'
  import recruit from '../plugin'
  import view, { Viewlet } from '@anticrm/view'

  let search = ''
  $: resultQuery = search === '' ? { } : { $search: search }

  const client = getClient()
  const tableDescriptor = client.findOne<Viewlet>(view.class.Viewlet, { attachTo: recruit.mixin.Candidate, descriptor: view.viewlet.Table })
</script>

<div class="candidates-header-container">
  <div class="header-container">
    <div class="flex-row-center">
      <span class="icon"><Icon icon={recruit.icon.Calendar} size={'small'}/></span>
      <span class="label"><Label label={recruit.string.Candidates}/></span>
    </div>
  </div>
  
  <EditWithIcon icon={IconSearch} placeholder={'Search'} bind:value={search} on:change={() => { resultQuery = {} } } />
</div>

<div class="container">
  <div class="panel-component">
    <ScrollBox vertical stretch noShift>
      {#await tableDescriptor then descr}
        {#if descr}
          <Table 
            _class={recruit.mixin.Candidate}
            config={descr.config}
            options={descr.options}
            query={ resultQuery }
            enableChecking
          />
        {/if}
      {/await}
  </ScrollBox>
  </div>
</div>
<style lang="scss">
  .container {
    display: flex;
    height: 100%;
    padding-bottom: 1.25rem;

    .panel-component {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      margin-right: 1rem;
      height: 100%;
      border-radius: 1.25rem;
      background-color: var(--theme-bg-color);
      overflow: hidden;
    }
  }
  .candidates-header-container {
    display: grid;
    grid-template-columns: auto;
    grid-auto-flow: column;
    grid-auto-columns: min-content;
    gap: .75rem;
    align-items: center;
    padding: 0 1.75rem 0 2.5rem;
    height: 4rem;
    min-height: 4rem;

    .header-container {
      display: flex;
      flex-direction: column;
      flex-grow: 1;

      .icon {
        margin-right: .5rem;
        opacity: .6;
      }
      .label, .description {
        flex-grow: 1;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
        max-width: 35rem;
      }
      .label {
        font-weight: 500;
        font-size: 1rem;
        color: var(--theme-caption-color);
      }
      .description {
        font-size: .75rem;
        color: var(--theme-content-trans-color);
      }
    }
  }
</style>
