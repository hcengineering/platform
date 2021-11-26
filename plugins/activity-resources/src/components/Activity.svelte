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
  import activity, { TxViewlet } from '@anticrm/activity'
  import chunter from '@anticrm/chunter'
  import { Doc, SortingOrder } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { ReferenceInput } from '@anticrm/text-editor'
  import { Grid, IconActivity, ScrollBox } from '@anticrm/ui'
  import { ActivityKey, activityKey, DisplayTx, newActivity } from '../activity'
  import TxView from './TxView.svelte'

  export let fullSize: boolean = false
  export let object: Doc

  let txes: DisplayTx[] = []

  const client = getClient()

  const activityQuery = newActivity(client)

  $: activityQuery.update(
    object,
    (result) => {
      txes = result
    },
    SortingOrder.Descending
  )

  function onMessage (event: CustomEvent) {
    client.addCollection(chunter.class.Comment, object.space, object._id, object._class, 'comments', {
      message: event.detail
    })
  }

  let viewlets: Map<ActivityKey, TxViewlet>

  const descriptors = createQuery()
  $: descriptors.query(activity.class.TxViewlet, {}, (result) => {
    viewlets = new Map(result.map((r) => [activityKey(r.objectClass, r.txClass), r]))
  })
</script>

{#if fullSize}
  <div class="flex-row-center header">
    <div class="icon"><IconActivity size={'small'} /></div>
    <div class="title">Activity</div>
  </div>
  <div class="flex-col h-full right-content">
    <ScrollBox vertical stretch>
      {#if txes}
        <Grid column={1} rowGap={1.5}>
          {#each txes as tx (tx.tx._id)}
            <TxView {tx} {viewlets} />
          {/each}
        </Grid>
      {/if}
    </ScrollBox>
  </div>
  <div class="ref-input"><ReferenceInput on:message={onMessage} /></div>
{:else}
  <div class="unionSection">
    <ScrollBox vertical stretch noShift>
      <div class="flex-col content">
        <slot />
      </div>
      <div class="flex-row-center activity header">
        <div class="icon"><IconActivity size={'small'} /></div>
        <div class="title">Activity</div>
      </div>
      <div class="flex-col activity content">
        {#if txes}
          <Grid column={1} rowGap={1.5}>
            {#each txes as tx}
              <TxView {tx} {viewlets} />
            {/each}
          </Grid>
        {/if}
      </div>
    </ScrollBox>
    <div class="ref-input"><ReferenceInput on:message={onMessage} /></div>
  </div>
{/if}

<style lang="scss">
  .header {
    flex-shrink: 0;
    padding: 0 2.5rem;
    height: 4.5rem;
    border-bottom: 1px solid var(--theme-card-divider);

    .icon {
      opacity: 0.6;
    }
    .title {
      flex-grow: 1;
      margin-left: 0.5rem;
      font-weight: 500;
      font-size: 1rem;
      color: var(--theme-caption-color);
      user-select: none;
    }
  }
  .activity {
    background-color: var(--theme-bg-accent-color);
    &.header {
      border-bottom: none;
    }
    &.content {
      flex-grow: 1;
      padding-bottom: 0;
      background-color: var(--theme-bg-accent-color);
    }
  }

  .ref-input {
    background-color: var(--theme-bg-accent-color);
    padding: 1.5rem 2.5rem;
  }

  .right-content {
    flex-grow: 1;
    padding: 2.5rem 2.5rem 0;
    background-color: var(--theme-dialog-accent);
  }

  .unionSection {
    flex-grow: 1;

    display: flex;
    flex-direction: column;
    height: max-content;

    .content {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      padding: 1.5rem 2.5rem;
      height: max-content;
    }
  }
</style>
