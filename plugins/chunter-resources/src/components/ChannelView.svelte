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
  import core, { Doc, getCurrentAccount, Ref, Space } from '@hcengineering/core'
  import {
    defineSeparators,
    getCurrentLocation,
    Label,
    location as locationStore,
    ModernButton,
    navigate,
    panelSeparators,
    Separator
  } from '@hcengineering/ui'
  import { DocNotifyContext } from '@hcengineering/notification'
  import { ActivityMessage } from '@hcengineering/activity'
  import { getClient } from '@hcengineering/presentation'
  import { Channel, ObjectChatPanel } from '@hcengineering/chunter'
  import view from '@hcengineering/view'
  import { messageInFocus } from '@hcengineering/activity-resources'
  import { Presence } from '@hcengineering/presence-resources'

  import ChannelComponent from './Channel.svelte'
  import ChannelHeader from './ChannelHeader.svelte'
  import DocAside from './chat/DocAside.svelte'
  import chunter from '../plugin'
  import ChannelAside from './chat/ChannelAside.svelte'
  import { isThreadMessage } from '../utils'

  export let object: Doc
  export let context: DocNotifyContext | undefined
  export let autofocus = true
  export let embedded: boolean = false
  export let readonly: boolean = false

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const acc = getCurrentAccount()

  let isThreadOpened = false
  let isAsideShown = false

  locationStore.subscribe((newLocation) => {
    isThreadOpened = newLocation.path[4] != null
  })

  $: readonly = hierarchy.isDerived(object._class, core.class.Space) ? readonly || (object as Space).archived : readonly
  $: showJoinOverlay = shouldShowJoinOverlay(object)
  $: isDocChat = !hierarchy.isDerived(object._class, chunter.class.ChunterSpace)
  $: withAside =
    !embedded && !isThreadOpened && !hierarchy.isDerived(object._class, chunter.class.DirectMessage) && !showJoinOverlay

  function toChannel (object: Doc): Channel {
    return object as Channel
  }

  function shouldShowJoinOverlay (object: Doc): boolean {
    if (hierarchy.isDerived(object._class, core.class.Space)) {
      const space = object as Space

      return !space.members.includes(acc.uuid)
    }

    return false
  }

  async function join (): Promise<void> {
    await client.update(object as Space, { $push: { members: acc.uuid } })
  }

  defineSeparators('aside', panelSeparators)

  async function handleMessageSelect (event: CustomEvent<ActivityMessage>): Promise<void> {
    const message = event.detail

    if (isThreadMessage(message)) {
      const location = getCurrentLocation()
      location.path[4] = message.attachedTo
      navigate(location)
    }

    messageInFocus.set(message._id)
  }

  let objectChatPanel: ObjectChatPanel | undefined
  let prevObjectId: Ref<Doc> | undefined = undefined

  $: if (prevObjectId !== object._id) {
    prevObjectId = object._id
    objectChatPanel = hierarchy.classHierarchyMixin(object._class, chunter.mixin.ObjectChatPanel)
    isAsideShown = isAsideShown ?? objectChatPanel?.openByDefault === true
  }
</script>

<Presence {object} />

<div class="popupPanel">
  <ChannelHeader
    _id={object._id}
    _class={object._class}
    {object}
    {withAside}
    canOpen={isDocChat}
    allowClose={embedded}
    {isAsideShown}
    canOpenInSidebar={true}
    on:close
    on:select={handleMessageSelect}
    on:aside-toggled={() => {
      isAsideShown = !isAsideShown
    }}
  />

  <div class="popupPanel-body" class:asideShown={withAside && isAsideShown}>
    <div class="popupPanel-body__main">
      {#key object._id}
        {#if !readonly && shouldShowJoinOverlay(object)}
          <div class="body h-full w-full clear-mins flex-center">
            <div class="joinOverlay">
              <div class="an-element__label header">
                <Label label={chunter.string.JoinChannelHeader} />
              </div>
              <span class="an-element__label">
                <Label label={chunter.string.JoinChannelText} />
              </span>
              <span class="mt-4"> </span>
              <ModernButton label={view.string.Join} kind={'primary'} dataId={'btnJoin'} on:click={join} />
            </div>
          </div>
        {:else}
          <ChannelComponent {context} {object} {autofocus} />
        {/if}
      {/key}
    </div>

    {#if withAside && isAsideShown}
      <Separator name="aside" float={false} index={0} />
      <div class="popupPanel-body__aside" class:float={false} class:shown={withAside && isAsideShown}>
        <Separator name="aside" float index={0} />
        <div class="antiPanel-wrap__content">
          {#if hierarchy.isDerived(object._class, chunter.class.Channel)}
            <ChannelAside object={toChannel(object)} {objectChatPanel} />
          {:else}
            <DocAside {object} {objectChatPanel} />
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .joinOverlay {
    display: flex;
    align-self: center;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    height: inherit;
    width: 35rem;
  }

  .header {
    font-weight: 600;
    margin: 1rem;
  }
</style>
