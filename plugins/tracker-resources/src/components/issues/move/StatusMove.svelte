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
  import { Ref, Status } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Issue, Project } from '@hcengineering/tracker'
  import { Button, Label } from '@hcengineering/ui'
  import { statusStore } from '@hcengineering/view-resources'
  import tracker from '../../../plugin'
  import { findTargetStatus } from '../../../utils'
  import StatusRefPresenter from '../StatusRefPresenter.svelte'

  export let issues: Issue[]
  export let targetProject: Project

  const client = getClient()

  $: missingStatuses = issues
    .map((it) => it.status)
    .filter((it, idx, arr) => {
      const targetStatus = findTargetStatus($statusStore, it, targetProject._id)

      return targetStatus === undefined && arr.indexOf(it) === idx
    })

  async function createMissingStatus (st: Ref<Status>): Promise<void> {
    const cur = $statusStore.get(st)
    if (cur === undefined) {
      return
    }
    await client.createDoc(cur._class, targetProject._id, {
      name: cur.name,
      ofAttribute: cur.ofAttribute,
      category: cur.category,
      color: cur.color,
      description: cur.description,
      rank: cur.rank
    })
  }
</script>

{#if missingStatuses.length > 0}
  <div class="mt-2">
    <Label label={tracker.string.Status} />
  </div>
  <div class="flex-col">
    {#each missingStatuses as st}
      <div class="status-option p-1 flex-row-center flex-between">
        <div class="side-columns aligned-text">
          <StatusRefPresenter value={st} kind={'list-header'} />
        </div>
        <div class="side-columns">
          <Button label={tracker.string.CreateMissingStatus} on:click={() => createMissingStatus(st)} />
        </div>
      </div>
    {/each}
  </div>
{/if}

<style lang="scss">
  .side-columns {
    width: 50%;
  }
  .aligned-text {
    display: flex;
    align-items: center;
  }
</style>
