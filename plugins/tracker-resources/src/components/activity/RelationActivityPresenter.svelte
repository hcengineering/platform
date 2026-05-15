<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import type { DocUpdateMessage } from '@hcengineering/activity'
  import type { Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { getOrBuildObject } from '@hcengineering/view-resources'
  import type { IssueRelation } from '@hcengineering/tracker'
  import tracker from '../../plugin'
  import IssueRelationPresenter from '../IssueRelationPresenter.svelte'

  /**
   *  — Activity-Log Remove-Detail Fix.
   *
   * Custom DocUpdateMessageViewlet component for IssueRelation events
   * (added / removed / updated). The viewlet label supplies the verb
   * prefix ("added dependency", "removed dependency", "updated
   * dependency"); this component renders the relation detail itself
   * (kind, signed lag, target title) by reusing IssueRelationPresenter.
   *
   * For removed relations the live findOne returns nothing, but
   * getOrBuildObject replays TxCUDs via buildRemovedDoc so the
   * presenter still gets a fully-populated IssueRelation doc. That
   * keeps the activity row identical regardless of action.
   */
  export let message: DocUpdateMessage
  export let _id: Ref<IssueRelation>
  // Optional preloaded value from the activity framework. When set we skip
  // the findOne + Tx replay entirely (single render path for create+update).
  export let value: IssueRelation | undefined = undefined

  const client = getClient()

  $: void resolve(_id)

  async function resolve (id: Ref<IssueRelation>): Promise<void> {
    if (value !== undefined) return
    value = await getOrBuildObject<IssueRelation>(client, id, tracker.class.IssueRelation)
  }

  // Surface `message` so svelte-check doesn't flag the prop as unused —
  // it is part of the DocUpdateMessageViewlet component contract.
  $: void message
</script>

{#if value !== undefined}
  <IssueRelationPresenter value={value} />
{:else}
  <span class="placeholder">…</span>
{/if}

<style lang="scss">
  .placeholder {
    color: var(--theme-content-trans-color);
  }
</style>
