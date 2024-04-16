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
  import { Doc, Ref, Class } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import {
    Component,
    defineSeparators,
    getCurrentLocation,
    location,
    navigate,
    Separator,
    Location
  } from '@hcengineering/ui'

  import { NavigatorModel, SpecialNavModel } from '@hcengineering/workbench'
  import { InboxNotificationsClientImpl } from '@hcengineering/notification-resources'
  import { onMount } from 'svelte'

  import ChatNavigator from './navigator/ChatNavigator.svelte'
  import ChannelView from '../ChannelView.svelte'
  import { chatSpecials, loadSavedAttachments } from './utils'
  import { SelectChannelEvent } from './types'
  import { decodeChannelURI, openChannel } from '../../navigation'

  export let visibleNav: boolean = true
  export let navFloat: boolean = false
  export let appsDirection: 'vertical' | 'horizontal' = 'horizontal'

  const notificationsClient = InboxNotificationsClientImpl.getClient()
  const contextByDocStore = notificationsClient.contextByDoc
  const objectQuery = createQuery()

  const navigatorModel: NavigatorModel = {
    spaces: [],
    specials: chatSpecials
  }

  let selectedData: { _id: Ref<Doc>, _class: Ref<Class<Doc>> } | undefined = undefined

  let currentSpecial: SpecialNavModel | undefined

  let object: Doc | undefined = undefined

  location.subscribe((loc) => {
    syncLocation(loc)
  })

  $: void loadObject(selectedData?._id, selectedData?._class)

  async function loadObject (_id?: Ref<Doc>, _class?: Ref<Class<Doc>>): Promise<void> {
    if (_id === undefined || _class === undefined) {
      object = undefined
      objectQuery.unsubscribe()
      return
    }

    objectQuery.query(
      _class,
      { _id },
      (res) => {
        object = res[0]
      },
      { limit: 1 }
    )
  }

  function syncLocation (loc: Location) {
    const specialId = loc.path[3]

    currentSpecial = navigatorModel?.specials?.find((special) => special.id === specialId)

    if (currentSpecial !== undefined) {
      selectedData = undefined
    } else {
      const [_id, _class] = decodeChannelURI(loc.path[3])

      selectedData = { _id, _class }
    }
  }

  function handleChannelSelected (event: CustomEvent): void {
    const detail = (event.detail ?? {}) as SelectChannelEvent

    selectedData = { _id: detail.object._id, _class: detail.object._class }

    if (selectedData._id !== object?._id) {
      object = detail.object
    }

    openChannel(selectedData._id, selectedData._class)
  }

  defineSeparators('chat', [
    { minSize: 20, maxSize: 40, size: 30, float: 'navigator' },
    { size: 'auto', minSize: 30, maxSize: 'auto', float: undefined }
  ])

  onMount(() => {
    loadSavedAttachments()
  })
</script>

<div class="flex-row-top h-full">
  {#if visibleNav}
    <div
      class="antiPanel-navigator {appsDirection === 'horizontal' ? 'portrait' : 'landscape'} background-surface-color"
    >
      <div class="antiPanel-wrap__content">
        <ChatNavigator objectId={selectedData?._id} {object} {currentSpecial} on:select={handleChannelSelected} />
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
    {:else if object}
      {@const context = $contextByDocStore.get(object._id)}
      <ChannelView {object} {context} />
    {/if}
  </div>
</div>
