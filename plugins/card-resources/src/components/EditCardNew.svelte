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
    Panel
  } from '@hcengineering/ui'
  import presence from '@hcengineering/presence'
  import { createQuery, createNotificationContextsQuery, getClient } from '@hcengineering/presentation'
  import { ParentsNavigator, showMenu } from '@hcengineering/view-resources'
  import view from '@hcengineering/view'
  import { NotificationContext } from '@hcengineering/communication-types'

  import card from '../plugin'
  import CardPresenter from './CardPresenter.svelte'
  import { openCardInSidebar } from '../utils'
  import EditCardTableOfContents from './EditCardTableOfContents.svelte'
  import { translate } from '@hcengineering/platform'
  import { makeRank } from '@hcengineering/rank'
  import TagsEditor from './TagsEditor.svelte'

  export let _id: Ref<Card>
  export let readonly: boolean = false
  export let embedded: boolean = false
  export let allowClose: boolean = true

  const manager = createFocusManager()
  const query = createQuery()
  const contextsQuery = createNotificationContextsQuery()

  let doc: WithLookup<Card> | undefined
  let context: NotificationContext | undefined = undefined
  let isContextLoaded = false

  let title: string = ''
  let prevId: Ref<Card> = _id

  $: if (prevId !== _id) {
    prevId = _id
    context = undefined
    isContextLoaded = false
  }

  $: query.query(card.class.Card, { _id }, async (result) => {
    if (result.length > 0) {
      ;[doc] = result
      title = doc.title
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
    const client = getClient()

    const canSave = title.trim().length > 0
    if (doc === undefined || !canSave) {
      return
    }

    const nameTrimmed = title.trim()

    if (nameTrimmed.length > 0 && nameTrimmed !== doc.title) {
      await client.update(doc, { title: nameTrimmed })
    }
  }
</script>

<FocusHandler {manager} />
{#if doc !== undefined}
  <Panel isAside={false} isHeader={false} {embedded} {allowClose} adaptive="disabled" on:open on:close>
    <div class="main-content clear-mins">
      {#key doc._id}
        <EditCardTableOfContents {doc} {readonly} {context} {isContextLoaded} />
      {/key}
    </div>

    <svelte:fragment slot="title">
      <ParentsNavigator element={doc} />
      <div class="title flex-row-center">
        <EditBox focusIndex={1} bind:value={title} placeholder={card.string.Card} on:blur={saveTitle} />
      </div>
      <TagsEditor {doc} />
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
      <!--      <Button-->
      <!--        icon={IconDetailsFilled}-->
      <!--        iconProps={{ size: 'medium' }}-->
      <!--        kind="icon"-->
      <!--        on:click={() => {-->
      <!--          if (doc != null) {-->
      <!--            void openCardInSidebar(doc._id, doc)-->
      <!--          }-->
      <!--        }}-->
      <!--      />-->

      {#if !readonly}
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
  }
  .title {
    font-size: 1rem;
    flex: 1;
    min-width: 10rem;
  }
</style>
