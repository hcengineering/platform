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
  import { eventToHTMLElement, Label, ModernButton, showPopup, Icon, ButtonIcon } from '@hcengineering/ui'
  import PinnedMessagesPopup from './PinnedMessagesPopup.svelte'
  import { createQuery } from '@hcengineering/presentation'
  import activity from '@hcengineering/activity'
  import { Class, Doc, Ref, Space } from '@hcengineering/core'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'

  import chunter from '../plugin'
  import { getChannelSpace } from '../utils'

  export let space: Ref<Space>
  export let _class: Ref<Class<Doc>>
  export let _id: Ref<Doc>
  export let withRefs: boolean = false
  export let iconOnly: boolean = false

  const dispatch = createEventDispatcher()
  const pinnedQuery = createQuery()
  const pinnedThreadsQuery = createQuery()
  const pinnedRefsQuery = createQuery()

  let pinnedMessagesCount = 0
  let pinnedThreadsCount = 0
  let refsCount = 0

  $: channelSpace = getChannelSpace(_class, _id, space)
  $: pinnedQuery.query(
    activity.class.ActivityMessage,
    { attachedTo: _id, isPinned: true, space: channelSpace },
    (res) => {
      pinnedMessagesCount = res.total
    },
    { total: true, limit: 1 }
  )

  $: pinnedThreadsQuery.query(
    chunter.class.ThreadMessage,
    { objectId: _id, isPinned: true, space: channelSpace },
    (res) => {
      pinnedThreadsCount = res.total
    },
    { total: true, limit: 1 }
  )

  $: if (withRefs) {
    pinnedRefsQuery.query(
      activity.class.ActivityReference,
      { attachedTo: _id, isPinned: true, space: { $ne: channelSpace } },
      (res) => {
        refsCount = res.total
      },
      { limit: 1, total: true }
    )
  }

  function openMessagesPopup (ev: MouseEvent): void {
    showPopup(
      PinnedMessagesPopup,
      { attachedTo: _id, attachedToClass: _class, space: channelSpace, withRefs },
      eventToHTMLElement(ev),
      (result) => {
        if (result == null) return
        dispatch('select', result)
      }
    )
  }

  $: count = pinnedMessagesCount + pinnedThreadsCount + refsCount
</script>

{#if count > 0}
  {#if iconOnly}
    <ButtonIcon icon={view.icon.Pin} size={'small'} on:click={openMessagesPopup} />
  {:else}
    <ModernButton size={'small'} on:click={openMessagesPopup}>
      <Icon icon={view.icon.Pin} size={'x-small'} />
      <span class="text-sm"><Label label={chunter.string.PinnedCount} params={{ count }} /></span>
    </ModernButton>
  {/if}
{/if}
