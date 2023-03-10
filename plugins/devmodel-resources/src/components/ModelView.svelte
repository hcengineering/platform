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
  import core, { Doc, TxCUD } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { ScrollBox, tooltip } from '@hcengineering/ui'
  import { toIntl } from '..'
  import ContentPopup from './ContentPopup.svelte'

  type TxCUDIndex = TxCUD<Doc> & { index: number }
  let txes: TxCUDIndex[] = []

  const activityQuery = createQuery()

  $: activityQuery.query<TxCUD<Doc>>(core.class.TxCUD, { objectSpace: core.space.Model }, (result) => {
    let c = 0
    txes = result.map((t) => ({ ...t, index: c++ } as TxCUDIndex))
  })
</script>

<ScrollBox vertical>
  <div class="model-content">
    <table class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Class</th>
          <th>ObjectID</th>
          <th>Body</th>
        </tr>
      </thead>
      <tbody>
        {#each txes as tx}
          <tr class="tr-body">
            <td>{tx.index}</td>
            <td>{tx._class}</td>
            <td>{tx.objectId}</td>
            <td>{tx.objectClass}</td>
            <td>
              <span use:tooltip={{ label: toIntl('Content'), component: ContentPopup, props: { content: tx } }}>
                Content
              </span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</ScrollBox>

<style lang="scss">
  .model-content {
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
    color: var(--dark-color);
    box-shadow: inset 0 -1px 0 0 var(--trans-content-10);
    user-select: none;
  }

  .tr-body {
    height: 3.25rem;
    color: var(--caption-color);
    border-bottom: 1px solid var(--divider-color);
  }
</style>
