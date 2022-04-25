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
  import { Class, Doc, Ref, SortingOrder } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { Component, Grid, IconActivity, Label, Scroller } from '@anticrm/ui'
  import { ActivityKey, activityKey, DisplayTx, newActivity } from '../activity'
  import TxView from './TxView.svelte'

  export let object: Doc
  export let fullSize: boolean = false
  export let showCommenInput: boolean = true
  export let transparent: boolean = false

  let txes: DisplayTx[] = []

  const client = getClient()
  const attrs = client.getHierarchy().getAllAttributes(object._class)

  const activityQuery = newActivity(client, attrs)

  let viewlets: Map<ActivityKey, TxViewlet>
  let editable: Map<Ref<Class<Doc>>, boolean> = new Map()

  const descriptors = createQuery()
  $: descriptors.query(activity.class.TxViewlet, {}, (result) => {
    viewlets = new Map(result.map((r) => [activityKey(r.objectClass, r.txClass), r]))

    editable = new Map(result.map(it => [it.objectClass, it.editable ?? false]))
  })

  $: activityQuery.update(
    object,
    (result) => {
      txes = result
    },
    SortingOrder.Descending,
    editable
  )

</script>

{#if fullSize || transparent}
  {#if transparent !== undefined && !transparent}
    <div class="ac-header short mirror-tool highlight">
      <div class="ac-header__wrap-title">
        <div class="flex-center icon"><IconActivity size={'small'} /></div>
        <span class="ac-header__title"><Label label={activity.string.Activity} /></span>
      </div>
    </div>
  {/if}
  <div class="flex-col h-full min-h-0" class:background-accent-bg-color={!transparent}>
    <Scroller>
      <div class="p-10 select-text">
        {#if txes}
          <Grid column={1} rowGap={1.5}>
            {#each txes as tx (tx.tx._id)}
              <TxView
                {tx}
                {viewlets}
              />
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
  <Scroller>
    <div class="p-10">
      <slot />
    </div>
    <div class="scroller-back">
      <div class="ac-header short mirror-tool">
        <div class="ac-header__wrap-title">
          <div class="flex-center icon"><IconActivity size={'small'} /></div>
          <span class="ac-header__title"><Label label={activity.string.Activity} /></span>
        </div>
      </div>
      <div class="p-activity">
        {#if txes}
          <Grid column={1} rowGap={1.5}>
            {#each txes as tx}
              <TxView {tx} {viewlets} />
            {/each}
          </Grid>
        {/if}
      </div>
    </div>
  </Scroller>
  {#if showCommenInput}
    <div class="ref-input">
      <Component is={chunter.component.CommentInput} props={{ object }} />
    </div>
  {/if}
{/if}

<style lang="scss">
  .icon {
    margin-right: 1rem;
    width: 2.25rem;
    height: 2.25rem;
    color: var(--primary-button-color);
    background-color: var(--primary-button-enabled);
    border-radius: 50%;
  }
  .ref-input {
    flex-shrink: 0;
    padding: 1.5rem 2.5rem;
  }
  .p-activity {
    padding: 1.5rem 2.5rem 2.5rem;
  }
  .scroller-back {
    background-color: var(--body-accent);
  }

  :global(.grid .msgactivity-container:last-child::after) {
    content: none;
  } // Remove the line in the last Activity message
</style>
