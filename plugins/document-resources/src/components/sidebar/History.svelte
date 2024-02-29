<!--
//
// Copyright © 2024 Hardcore Engineering Inc.
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
//
-->
<script lang="ts">
  import { Document, DocumentSnapshot } from '@hcengineering/document'
  import { createQuery } from '@hcengineering/presentation'
  import { Button, Label, Lazy, Scroller, showPopup } from '@hcengineering/ui'

  import document from '../../plugin'
  import HistoryView from './HistoryView.svelte'
  import CreateSnapshot from '../CreateSnapshot.svelte'

  export let value: Document
  export let readonly: boolean = false

  const query = createQuery()

  let snapshots: DocumentSnapshot[] = []

  $: query.query(
    document.class.DocumentSnapshot,
    {
      attachedTo: value._id
    },
    (res) => {
      snapshots = res
    },
    {
      sort: { createdOn: -1 }
    }
  )

  async function takeSnapshot (): Promise<void> {
    showPopup(CreateSnapshot, { doc: value }, 'top')
  }
</script>

<div class="h-full flex-col clear-mins">
  <div class="header">
    <div class="title"><Label label={document.string.History} /></div>
    {#if !readonly}
      <Button
        icon={document.icon.Add}
        iconProps={{ size: 'medium' }}
        kind={'ghost'}
        showTooltip={{ label: document.string.Snapshot, direction: 'bottom' }}
        on:click={takeSnapshot}
      />
    {/if}
  </div>

  <div class="divider" />

  {#if snapshots.length > 0}
    <Scroller>
      {#each snapshots as snapshot}
        <Lazy>
          <HistoryView value={snapshot} />
        </Lazy>
      {/each}
    </Scroller>
  {:else}
    <div class="flex-col justify-center flex-grow text-center">
      <div class="label nowrap fs-bold">
        <Label label={document.string.NoHistory} />
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 1.25rem;
    height: 3rem;
    min-height: 3rem;
    border-bottom: 1px solid var(--theme-divider-color);

    .title {
      flex-grow: 1;
      font-weight: 500;
      color: var(--caption-color);
      user-select: none;
    }
  }
</style>
