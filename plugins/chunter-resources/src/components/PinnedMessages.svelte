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
  import { eventToHTMLElement, Label, showPopup } from '@hcengineering/ui'
  import PinnedMessagesPopup from './PinnedMessagesPopup.svelte'
  import { createQuery } from '@hcengineering/presentation'
  import { DocNotifyContext } from '@hcengineering/notification'
  import activity, { ActivityMessage } from '@hcengineering/activity'

  import chunter from '../plugin'

  export let notifyContext: DocNotifyContext

  const pinnedQuery = createQuery()

  let pinnedMessagesCount = 0

  $: pinnedQuery.query(
    activity.class.ActivityMessage,
    { attachedTo: notifyContext.attachedTo, isPinned: true },
    (res: ActivityMessage[]) => {
      pinnedMessagesCount = res.length
    }
  )
  function openMessagesPopup (ev: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }) {
    showPopup(
      PinnedMessagesPopup,
      { attachedTo: notifyContext.attachedTo, attachedToClass: notifyContext.attachedToClass },
      eventToHTMLElement(ev)
    )
  }
</script>

{#if pinnedMessagesCount > 0}
  <div class="bottom-divider over-underline pt-2 pb-2 container">
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div on:click={openMessagesPopup}>
      <Label label={chunter.string.Pinned} />
      {pinnedMessagesCount}
    </div>
  </div>
{/if}

<style lang="scss">
  .container {
    padding-left: 2.5rem;
  }
</style>
