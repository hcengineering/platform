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
  import { ScrollBox, Tooltip } from '@anticrm/ui'
  import ActionIcon from '@anticrm/ui/src/components/ActionIcon.svelte'
  import view from '@anticrm/view'
  import { queries, toIntl } from '..'
  import ContentPopup from './ContentPopup.svelte'
</script>

<ScrollBox vertical>
  <div class="query-content">
    <table class="table">
      <thead>
        <tr>
          <th>Index</th>
          <th>Class</th>
          <th>Query</th>
          <th>Options</th>
          <th>Result Count</th>
          <th>Result</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each queries as q}
          <tr class="tr-body">
            <td>{queries.indexOf(q)}</td>
            <td>{q._class}</td>
            <td>{JSON.stringify(q.query)}</td>
            <td>{JSON.stringify(q.options ?? {})}</td>
            <td>{q.result.length}</td>
            <td>
              <Tooltip label={toIntl('Content')} component={ContentPopup} props={{ content: q.result }}>
                Results
              </Tooltip>
            </td>
            <td>
              <ActionIcon
                direction={undefined}
                size="small"
                icon={view.icon.MoreH}
                label={toIntl('Perform Class Query')}
                action={() => {}}
              />
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</ScrollBox>

<style lang="scss">
  .query-content {
    display: flex;
    margin: 20px;
  }

  th,
  td {
    padding: 0.5rem 1.5rem;
    text-align: left;
  }

  th {
    height: 2.5rem;
    font-weight: 500;
    font-size: 0.75rem;
    color: var(--theme-content-dark-color);
    box-shadow: inset 0 -1px 0 0 var(--theme-bg-focused-color);
    user-select: none;
  }

  .tr-body {
    height: 3.25rem;
    color: var(--theme-caption-color);
    border-bottom: 1px solid var(--theme-button-border-hovered);
  }
</style>
