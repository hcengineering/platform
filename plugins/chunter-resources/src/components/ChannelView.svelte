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
  import { Doc, Ref } from '@hcengineering/core'
  import { defineSeparators, location as locationStore, panelSeparators, Separator } from '@hcengineering/ui'
  import { DocNotifyContext } from '@hcengineering/notification'
  import { ActivityMessagesFilter } from '@hcengineering/activity'
  import { getClient } from '@hcengineering/presentation'
  import { Channel } from '@hcengineering/chunter'

  import ChannelComponent from './Channel.svelte'
  import ChannelHeader from './ChannelHeader.svelte'
  import DocAside from './chat/DocAside.svelte'
  import chunter from '../plugin'
  import ChannelAside from './chat/ChannelAside.svelte'

  export let object: Doc
  export let context: DocNotifyContext | undefined
  export let allowClose = false
  export let embedded = false

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let isThreadOpened = false
  let isAsideShown = false

  let filters: Ref<ActivityMessagesFilter>[] = []

  locationStore.subscribe((newLocation) => {
    isThreadOpened = newLocation.path[4] != null
  })

  $: isDocChat = !hierarchy.isDerived(object._class, chunter.class.ChunterSpace)
  $: withAside = !embedded && !isThreadOpened && !hierarchy.isDerived(object._class, chunter.class.DirectMessage)

  function toChannel (object?: Doc): Channel | undefined {
    return object as Channel | undefined
  }

  defineSeparators('aside', panelSeparators)
</script>

<div class="popupPanel panel" class:embedded>
  <ChannelHeader
    _id={object._id}
    _class={object._class}
    {object}
    {allowClose}
    {withAside}
    bind:filters
    canOpen={isDocChat}
    {isAsideShown}
    on:close
    on:aside-toggled={() => {
      isAsideShown = !isAsideShown
    }}
  />

  <div class="popupPanel-body" class:asideShown={withAside && isAsideShown}>
    <div class="popupPanel-body__main">
      {#key object._id}
        <ChannelComponent {context} {object} {filters} isAsideOpened={(withAside && isAsideShown) || isThreadOpened} />
      {/key}
    </div>

    {#if withAside && isAsideShown}
      <Separator name="aside" float={false} index={0} />
      <div class="popupPanel-body__aside" class:float={false} class:shown={withAside && isAsideShown}>
        <Separator name="aside" float index={0} />
        <div class="antiPanel-wrap__content">
          {#if hierarchy.isDerived(object._class, chunter.class.Channel)}
            <ChannelAside _class={object._class} object={toChannel(object)} />
          {:else}
            <DocAside _class={object._class} {object} />
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>
