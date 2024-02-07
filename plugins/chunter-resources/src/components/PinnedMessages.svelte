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
  import { eventToHTMLElement, Label, ModernButton, showPopup } from '@hcengineering/ui'
  import PinnedMessagesPopup from './PinnedMessagesPopup.svelte'
  import { createQuery } from '@hcengineering/presentation'
  import { DocNotifyContext } from '@hcengineering/notification'
  import activity, { ActivityMessage } from '@hcengineering/activity'
  import { Class, Doc, Ref } from '@hcengineering/core'
  import view from '@hcengineering/view'

  import chunter from '../plugin'

  export let _class: Ref<Class<Doc>>
  export let _id: Ref<Doc>

  const pinnedQuery = createQuery()

  let pinnedMessagesCount = 0

  $: pinnedQuery.query(
    activity.class.ActivityMessage,
    { attachedTo: _id, isPinned: true },
    (res: ActivityMessage[]) => {
      pinnedMessagesCount = res.length
    }
  )
  function openMessagesPopup (ev: MouseEvent) {
    showPopup(PinnedMessagesPopup, { attachedTo: _id, attachedToClass: _class }, eventToHTMLElement(ev))
  }
</script>

{#if pinnedMessagesCount > 0}
  <div class="mr-2">
    <ModernButton
      icon={view.icon.Pin}
      size="small"
      label={chunter.string.PinnedCount}
      labelParams={{ count: pinnedMessagesCount }}
      on:click={openMessagesPopup}
    />
  </div>
{/if}

<style lang="scss">
  .container {
    padding-left: 2.5rem;
  }
</style>
