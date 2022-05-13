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
  import core, { Doc, SortingOrder } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { Component, Grid, IconActivity, Label, Scroller } from '@anticrm/ui'
  import { ActivityKey, activityKey, DisplayTx, newActivity } from '../activity'
  import TxView from './TxView.svelte'

  export let object: Doc
  export let integrate: boolean = false
  export let showCommenInput: boolean = true
  export let transparent: boolean = false

  let txes: DisplayTx[] = []

  const client = getClient()
  const attrs = client.getHierarchy().getAllAttributes(object._class)

  const activityQuery = newActivity(client, attrs)

  let viewlets: Map<ActivityKey, TxViewlet>

  let allViewlets: TxViewlet[] = []

  const descriptors = createQuery()
  $: descriptors.query(activity.class.TxViewlet, {}, (result) => {
    allViewlets = result
  })

  $: viewlets = new Map(allViewlets.map((r) => [activityKey(r.objectClass, r.txClass), r]))

  $: activityQuery.update(
    object,
    (result) => {
      txes = result
    },
    SortingOrder.Descending,
    new Map(
      allViewlets
        .filter((tx) => tx.txClass === core.class.TxCreateDoc)
        .map((it) => [it.objectClass, it.editable ?? false])
    )
  )
</script>

{#if !integrate || transparent}
  {#if transparent !== undefined && !transparent}
    <div class="ac-header short mirror-tool highlight">
      <div class="ac-header__wrap-title">
        <div class="flex-center icon"><IconActivity size={'small'} /></div>
        <span class="ac-header__title"><Label label={activity.string.Activity} /></span>
      </div>
    </div>
  {/if}
  <div class="flex-col flex-grow min-h-0" class:background-accent-bg-color={!transparent}>
    <Scroller>
      <div class="p-10 select-text">
        {#if txes}
          <Grid column={1} rowGap={1.5}>
            {#each txes as tx}
              <TxView {tx} {viewlets} />
            {/each}
          </Grid>
        {/if}
      </div>
    </Scroller>
    {#if showCommenInput}
      <div class="ref-input">
        <Component is={chunter.component.CommentInput} props={{ object }} />
      </div>
    {/if}
  </div>
{:else}
  <slot />
  <div class="antiDivider" style:margin={'1rem -1.5rem'} />
  <div class="header antiTitle">
    <div class="icon-wrapper">
      <div class="wrapped-icon icon flex-center"><IconActivity size={'small'} /></div>
      <span class="wrapped-title"><Label label={activity.string.Activity} /></span>
    </div>
  </div>
  {#if showCommenInput}
    <div class="ref-input">
      <Component is={chunter.component.CommentInput} props={{ object }} />
    </div>
  {/if}
  <div class="p-activity select-text">
    {#if txes}
      <Grid column={1} rowGap={1.5}>
        {#each txes as tx}
          <TxView {tx} {viewlets} />
        {/each}
      </Grid>
    {/if}
  </div>
{/if}

<style lang="scss">
  .header {
    display: flex;
    align-items: center;
    min-height: 2.5rem;
    height: 2.5rem;
    background-color: var(--accent-bg-color);
    border: 1px solid var(--divider-color);
    border-radius: 0.125rem;
  }
  .icon {
    margin-left: 1rem;
    height: 2rem;
    color: var(--caption-color);
  }
  .ref-input {
    flex-shrink: 0;
    padding: 1.5rem 0;
  }
  .p-activity {
    padding: 1.5rem 0;
  }

  :global(.grid .msgactivity-container:last-child::after) {
    content: none;
  } // Remove the line in the last Activity message
</style>
