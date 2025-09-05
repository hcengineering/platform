<!--
//
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
//
-->
<script lang="ts">
  import { Card } from '@hcengineering/card'
  import { Ref, WithLookup } from '@hcengineering/core'
  import {
    Button,
    Component,
    createFocusManager,
    EditBox,
    FocusHandler,
    getCurrentLocation,
    IconDetailsFilled,
    IconMoreH,
    navigate,
    Panel,
    IPanelState,
    deviceOptionsStore as deviceInfo
  } from '@hcengineering/ui'
  import presence from '@hcengineering/presence'
  import { createQuery, createNotificationContextsQuery, getClient } from '@hcengineering/presentation'
  import { ParentsNavigator, showMenu } from '@hcengineering/view-resources'
  import view from '@hcengineering/view'
  import { NotificationContext } from '@hcengineering/communication-types'

  import card from '../plugin'
  import CardIcon from './CardIcon.svelte'
  import TagsEditor from './TagsEditor.svelte'
  import EditCardNewContent from './EditCardNewContent.svelte'
  import { openCardInSidebar } from '../utils'
  import { afterUpdate } from 'svelte'

  export let _id: Ref<Card>
  export let readonly: boolean = false
  export let embedded: boolean = false
  export let allowClose: boolean = true

  const DROPDOWN_POINT = 1024
  const NO_PARENTS_POINT = 800

  const manager = createFocusManager()
  const query = createQuery()
  const contextsQuery = createNotificationContextsQuery()

  let doc: WithLookup<Card> | undefined
  let context: NotificationContext | undefined = undefined
  let isContextLoaded = false

  let title: string = ''
  let isTitleEditing = false
  let prevId: Ref<Card> = _id

  $: if (prevId !== _id) {
    prevId = _id
    context = undefined
    isContextLoaded = false
    isTitleEditing = false
  }

  $: query.query(card.class.Card, { _id }, async (result) => {
    if (result.length > 0) {
      ;[doc] = result
      if (!isTitleEditing) {
        title = doc.title
      }
    } else {
      const loc = getCurrentLocation()
      loc.path.length = 3
      navigate(loc)
    }
  })

  $: contextsQuery.query({ card: _id, limit: 1 }, (res) => {
    context = res.getResult()[0]
    isContextLoaded = true
  })

  async function saveTitle (ev: Event): Promise<void> {
    ev.preventDefault()
    isTitleEditing = false
    const client = getClient()
    const trimmedTitle = title.trim()
    const canSave = trimmedTitle.length > 0 && !_readonly

    if (doc === undefined || !canSave) {
      return
    }

    if (trimmedTitle !== doc.title) {
      await client.update(doc, { title: trimmedTitle })
    }
  }

  let element: HTMLElement
  let titleEl: HTMLElement | null = null
  let extraEl: HTMLElement | null = null
  let showParents: boolean = !$deviceInfo.isMobile
  let dropdownTags: boolean = false

  const shrinkElement = (el: 'title' | 'extra'): void => {
    if (element === undefined || titleEl === null || extraEl === null) return
    if (el === 'title') {
      titleEl.classList.add('flex-shrink-15')
      extraEl.classList.remove('flex-shrink-15')
    } else {
      titleEl.classList.remove('flex-shrink-15')
      extraEl.classList.add('flex-shrink-15')
    }
  }

  const updateTitleGroup = (event: CustomEvent<IPanelState>): void => {
    const { headerWidth, titleOverflow, extraOverflow } = event.detail
    if (element === undefined || extraEl === null) return
    if (!dropdownTags && headerWidth < DROPDOWN_POINT && (titleOverflow || extraOverflow)) {
      dropdownTags = true
      shrinkElement('title')
    } else if (dropdownTags && headerWidth >= DROPDOWN_POINT) {
      dropdownTags = false
      shrinkElement('extra')
    } else if (headerWidth >= DROPDOWN_POINT && !extraEl.classList.contains('flex-shrink-15')) {
      shrinkElement('extra')
    }
    if (headerWidth < NO_PARENTS_POINT && showParents) showParents = false
    else if (headerWidth >= NO_PARENTS_POINT && !showParents) showParents = !$deviceInfo.isMobile
  }

  afterUpdate(() => {
    if (element !== undefined) {
      titleEl = element.querySelector('.hulyHeader-titleGroup')
      extraEl = element.querySelector('.hulyHeader-buttonsGroup.extra')
    }
  })

  $: _readonly = (readonly || doc?.readonly) ?? false
</script>

<FocusHandler {manager} />
{#if doc !== undefined}
  <Panel
    bind:element
    isAside={false}
    isHeader={false}
    {embedded}
    {allowClose}
    adaptive={'disabled'}
    overflowExtra
    on:resize={updateTitleGroup}
    on:open
    on:close
  >
    <div class="main-content clear-mins">
      <EditCardNewContent {_id} {doc} readonly={_readonly} {context} {isContextLoaded} />
    </div>

    <svelte:fragment slot="beforeTitle">
      <CardIcon value={doc} />
    </svelte:fragment>

    <svelte:fragment slot="title">
      {#if showParents}
        <ParentsNavigator element={doc} maxWidth={'10rem'} />
      {/if}
      <div class="title flex-row-center">
        {#if !_readonly}
          <EditBox
            focusIndex={1}
            bind:value={title}
            placeholder={card.string.Card}
            on:blur={saveTitle}
            on:value={() => {
              isTitleEditing = true
            }}
          />
        {:else}
          {doc.title}
        {/if}
      </div>
    </svelte:fragment>

    <svelte:fragment slot="presence">
      <Component is={presence.component.PresenceAvatars} props={{ object: doc, size: 'x-small', limit: 5 }} />
    </svelte:fragment>

    <svelte:fragment slot="pre-utils">
      <slot name="pre-utils" />
    </svelte:fragment>

    <svelte:fragment slot="panel-footer">
      <slot name="panel-footer" />
    </svelte:fragment>

    <svelte:fragment slot="utils">
      <Button
        icon={IconDetailsFilled}
        iconProps={{ size: 'medium' }}
        kind="icon"
        on:click={() => {
          if (doc != null) {
            void openCardInSidebar(doc._id, doc)
          }
        }}
      />

      {#if !_readonly}
        <Button
          icon={IconMoreH}
          iconProps={{ size: 'medium' }}
          kind="icon"
          dataId="btnMoreActions"
          on:click={(e) => {
            showMenu(e, { object: doc, excludedActions: [view.action.Open] })
          }}
        />
      {/if}
    </svelte:fragment>

    <svelte:fragment slot="header">
      {#if $$slots.header}
        <div class="header-row between">
          {#if $$slots.header}
            <slot name="header" />
          {/if}
          <div class="buttons-group xsmall-gap ml-4" style:align-self={'flex-start'}>
            <slot name="tools" />
          </div>
        </div>
      {/if}
    </svelte:fragment>

    <svelte:fragment slot="post-utils">
      <slot name="post-utils" />
    </svelte:fragment>

    <svelte:fragment slot="extra">
      <TagsEditor {doc} {dropdownTags} id={'cardHeader-tags'} />
      <slot name="extra" />
    </svelte:fragment>

    <svelte:fragment slot="page-header">
      <slot name="page-header" />
    </svelte:fragment>

    <svelte:fragment slot="page-footer">
      <slot name="page-footer" />
    </svelte:fragment>
  </Panel>
{/if}

<style lang="scss">
  .main-content {
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
  }
  .title {
    font-size: 1rem;
    flex: 1;
    min-width: 2rem;
  }
</style>
