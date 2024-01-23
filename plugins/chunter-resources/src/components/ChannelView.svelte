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
  import { Ref, Doc } from '@hcengineering/core'
  import { defineSeparators, location as locationStore, panelSeparators, Separator } from '@hcengineering/ui'
  import { DocNotifyContext } from '@hcengineering/notification'
  import activity, { ActivityMessagesFilter } from '@hcengineering/activity'
  import { getClient } from '@hcengineering/presentation'

  import Channel from './Channel.svelte'
  import PinnedMessages from './PinnedMessages.svelte'
  import ChannelHeader from './ChannelHeader.svelte'
  import DocChatPanel from './chat/DocChatPanel.svelte'
  import chunter from '../plugin'

  export let context: DocNotifyContext
  export let object: Doc
  export let filterId: Ref<ActivityMessagesFilter> = activity.ids.AllFilter
  export let allowClose = false
  export let embedded = false

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let isThreadOpened = false

  $: isDocChat = !hierarchy.isDerived(object._class, chunter.class.ChunterSpace)
  $: asideShown = !embedded && isDocChat && !isThreadOpened

  locationStore.subscribe((newLocation) => {
    isThreadOpened = newLocation.path[4] != null
  })

  defineSeparators('aside', panelSeparators)
</script>

<div class="popupPanel panel" class:embedded>
  <ChannelHeader {object} {allowClose} on:close />
  <div class="popupPanel-body" class:asideShown>
    <div class="popupPanel-body__main">
      <PinnedMessages {context} />
      <Channel {context} {object} {filterId} />
    </div>

    {#if asideShown}
      <Separator name="aside" float={false} index={0} />
      <div class="popupPanel-body__aside" class:float={false} class:shown={asideShown}>
        <Separator name="aside" float index={0} />
        <div class="antiPanel-wrap__content">
          <DocChatPanel {object} {filterId} />
        </div>
      </div>
    {/if}
  </div>
</div>
