<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import {
    defineSeparators,
    Separator,
    deviceOptionsStore as deviceInfo,
    resolvedLocationStore,
    Location,
    restoreLocation,
    Component,
    closePanel,
    getCurrentLocation
  } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import { getClient } from '@hcengineering/presentation'
  import { inboxId } from '@hcengineering/inbox'
  import view from '@hcengineering/view'
  import { Class, Doc, getCurrentAccount, Ref } from '@hcengineering/core'
  import notification, { DocNotifyContext } from '@hcengineering/notification'
  import { NotificationContext } from '@hcengineering/communication-types'
  import chunter from '@hcengineering/chunter'

  import InboxNavigation from './InboxNavigation.svelte'
  import { closeDoc, getDocInfoFromLocation, navigateToDoc } from '../location'
  import InboxHeader from './InboxHeader.svelte'
  import { NavigationItem } from '../type'
  import activity from '@hcengineering/activity'

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let replacedPanelElement: HTMLElement
  let doc: Doc | undefined = undefined
  let context: DocNotifyContext | NotificationContext | undefined = undefined
  let needRestoreLoc = true

  let urlObjectId: Ref<Doc> | undefined = undefined
  let urlObjectClass: Ref<Class<Doc>> | undefined = undefined

  async function syncLocation (loc: Location): Promise<void> {
    if (loc.path[2] !== inboxId) {
      return
    }

    const docInfo = getDocInfoFromLocation(loc)

    if (docInfo == null) {
      doc = undefined
      urlObjectId = undefined
      urlObjectClass = undefined
      context = undefined
      if (needRestoreLoc) {
        needRestoreLoc = false
        restoreLocation(loc, inboxId)
      }
      return
    }

    urlObjectId = docInfo._id
    urlObjectClass = docInfo._class

    needRestoreLoc = false

    if (docInfo._id !== doc?._id) {
      doc = await client.findOne(docInfo._class, { _id: docInfo._id })

      if (doc != null) {
        context = await client.findOne(notification.class.DocNotifyContext, {
          objectId: doc._id,
          user: getCurrentAccount().uuid
        })
      }
    }
  }

  function select (event: CustomEvent<NavigationItem>): void {
    console.log('select', event.detail)
    if (event.detail.doc == null) return
    const loc = getCurrentLocation()
    if (doc?._id === event.detail._id && loc.path[2] === inboxId) return
    closePanel()
    doc = event.detail.doc
    context = event.detail.context
    navigateToDoc(doc._id, doc._class)
  }

  function handleClose (): void {
    doc = undefined
    context = undefined
    closeDoc()
  }

  function isChunterChannel (_class: Ref<Class<Doc>>, urlObjectClass?: Ref<Class<Doc>>): boolean {
    const isActivityMessageContext = hierarchy.isDerived(_class, activity.class.ActivityMessage)
    const chunterClass = isActivityMessageContext ? urlObjectClass ?? _class : _class
    return hierarchy.isDerived(chunterClass, chunter.class.ChunterSpace)
  }

  onDestroy(
    resolvedLocationStore.subscribe((loc) => {
      void syncLocation(loc)
    })
  )

  defineSeparators('new-inbox', [
    { minSize: 15, maxSize: 60, size: 30, float: 'navigator' },
    { size: 'auto', minSize: 20, maxSize: 'auto' }
  ])

  $: $deviceInfo.replacedPanel = replacedPanelElement
  onDestroy(() => ($deviceInfo.replacedPanel = undefined))
</script>

<div class="hulyPanels-container inbox">
  {#if $deviceInfo.navigator.visible}
    <div
      class="antiPanel-navigator {$deviceInfo.navigator.direction === 'horizontal'
        ? 'portrait'
        : 'landscape'} border-left inbox__navigator"
      class:fly={$deviceInfo.navigator.float}
    >
      <div class="antiPanel-wrap__content hulyNavPanel-container">
        <InboxHeader />
        <div class="antiPanel-wrap__content hulyNavPanel-container">
          <InboxNavigation {doc} on:select={select} />
        </div>
      </div>
      {#if !($deviceInfo.isMobile && $deviceInfo.isPortrait && $deviceInfo.minWidth)}
        <Separator name="new-inbox" float={$deviceInfo.navigator.float ? 'navigator' : true} index={0} />
      {/if}
    </div>
    <Separator
      name="new-inbox"
      float={$deviceInfo.navigator.float}
      index={0}
      color={'transparent'}
      separatorSize={0}
      short
    />
  {/if}

  <!--          activityMessage: selectedMessage,-->
  <div bind:this={replacedPanelElement} class="hulyComponent inbox__panel">
    {#if doc}
      {@const panel = client.getHierarchy().classHierarchyMixin(doc._class, view.mixin.ObjectPanel)}
      <Component
        is={panel?.component ?? view.component.EditDoc}
        props={{
          _id: isChunterChannel(doc._class, urlObjectClass) ? urlObjectId ?? doc._id : doc._id,
          _class: isChunterChannel(doc._class, urlObjectClass) ? urlObjectClass ?? doc._class : doc._class,
          context,
          autofocus: false,
          embedded: true,
          props: { autofocus: false, context }
        }}
        on:close={handleClose}
      />
    {/if}
  </div>
</div>

<style lang="scss">
  .inbox {
    &__navigator {
      position: relative;
    }

    &__panel {
      position: relative;
    }
  }
</style>
