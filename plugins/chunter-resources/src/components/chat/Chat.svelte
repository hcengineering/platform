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
  import { createQuery } from '@hcengineering/presentation'
  import { Component, defineSeparators, getCurrentLocation, location, navigate, Separator } from '@hcengineering/ui'
  import chunter from '@hcengineering/chunter'
  import notification, { DocNotifyContext } from '@hcengineering/notification'
  import { NavHeader } from '@hcengineering/workbench-resources'
  import { NavigatorModel, SpecialNavModel } from '@hcengineering/workbench'
  import { ActivityMessagesFilter } from '@hcengineering/activity'

  import ChatNavigator from './navigator/ChatNavigator.svelte'
  import ChannelView from '../ChannelView.svelte'
  import DocChatPanel from './DocChatPanel.svelte'
  import { chatSpecials } from './utils'

  export let visibleNav: boolean = true
  export let navFloat: boolean = false
  export let appsDirection: 'vertical' | 'horizontal' = 'horizontal'

  const notifyContextQuery = createQuery()
  const objectQuery = createQuery()

  const navigatorModel: NavigatorModel = {
    spaces: [],
    specials: chatSpecials
  }

  let selectedContextId: Ref<DocNotifyContext> | undefined = undefined
  let selectedContext: DocNotifyContext | undefined = undefined
  let filterId: Ref<ActivityMessagesFilter> | undefined = undefined

  let object: Doc | undefined = undefined

  let currentSpecial: SpecialNavModel | undefined

  location.subscribe((loc) => {
    updateSpecialComponent(loc.path[3])
    updateSelectedContext(loc.path[3])
    filterId = loc.query?.filter as Ref<ActivityMessagesFilter> | undefined
  })

  function updateSpecialComponent (id?: string): SpecialNavModel | undefined {
    if (id === undefined) {
      return
    }

    currentSpecial = navigatorModel?.specials?.find((special) => special.id === id)
  }

  function updateSelectedContext (id?: string) {
    selectedContextId = id as Ref<DocNotifyContext> | undefined

    if (selectedContext && selectedContextId !== selectedContext._id) {
      selectedContext = undefined
    }
  }

  defineSeparators('chat', [
    { minSize: 20, maxSize: 40, size: 30, float: 'navigator' },
    { size: 'auto', minSize: 30, maxSize: 'auto', float: undefined }
  ])

  $: selectedContextId &&
    notifyContextQuery.query(
      notification.class.DocNotifyContext,
      { _id: selectedContextId },
      (res: DocNotifyContext[]) => {
        selectedContext = res[0]
      }
    )

  $: selectedContext !== undefined &&
    objectQuery.query(selectedContext.attachedToClass, { _id: selectedContext.attachedTo }, (res: Doc[]) => {
      object = res[0]
    })

  $: if (selectedContext) {
    console.log({ selectedContext: selectedContext.attachedToClass })
  }

  $: isDocChatOpened =
    selectedContext !== undefined &&
    ![chunter.class.Channel, chunter.class.DirectMessage].includes(selectedContext.attachedToClass)
</script>

<div class="flex-row-top h-full">
  {#if visibleNav}
    <div
      class="antiPanel-navigator {appsDirection === 'horizontal'
        ? 'portrait'
        : 'landscape'} background-comp-header-color"
    >
      <div class="antiPanel-wrap__content">
        {#if !isDocChatOpened}
          <NavHeader label={chunter.string.Chat} />
          <ChatNavigator {selectedContextId} {currentSpecial} />
        {:else if object}
          <DocChatPanel {object} {filterId} />
        {/if}
      </div>
      <Separator name="chat" float={navFloat ? 'navigator' : true} index={0} />
    </div>
    <Separator name="chat" float={navFloat} index={0} />
  {/if}

  <div class="antiPanel-component filled w-full">
    {#if currentSpecial}
      <Component
        is={currentSpecial.component}
        props={{
          model: navigatorModel,
          ...currentSpecial.componentProps,
          visibleNav,
          navFloat,
          appsDirection
        }}
        on:action={(e) => {
          if (e?.detail) {
            const loc = getCurrentLocation()
            loc.query = { ...loc.query, ...e.detail }
            navigate(loc)
          }
        }}
      />
    {/if}
    {#if selectedContext && object}
      {#key selectedContext._id}
        <ChannelView notifyContext={selectedContext} {object} {filterId} />
      {/key}
    {/if}
  </div>
</div>
