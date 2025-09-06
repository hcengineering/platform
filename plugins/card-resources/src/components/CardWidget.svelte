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
  import { closeWidget } from '@hcengineering/workbench-resources'
  import { Widget, WidgetTab } from '@hcengineering/workbench'
  import { createQuery, createNotificationContextsQuery, getClient } from '@hcengineering/presentation'
  import { NotificationContext } from '@hcengineering/communication-types'
  import { createEventDispatcher } from 'svelte'
  import { Card } from '@hcengineering/card'
  import { Ref } from '@hcengineering/core'
  import { Button, EditBox, Header, IconClose, IconMoreH } from '@hcengineering/ui'

  import card from '../plugin'
  import EditCardNewContent from './EditCardNewContent.svelte'
  import { showMenu } from '@hcengineering/view-resources'
  import TagsEditor from './TagsEditor.svelte'

  export let widget: Widget | undefined
  export let tab: WidgetTab | undefined
  export let height: string
  export let width: string

  const query = createQuery()
  const contextsQuery = createNotificationContextsQuery()
  const dispatch = createEventDispatcher()

  let doc: Card | undefined = undefined
  let context: NotificationContext | undefined = undefined
  let isContextLoaded = false

  let title: string = ''
  let isTitleEditing = false

  $: if (widget === undefined || tab === undefined) {
    closeWidget(card.ids.CardWidget as Ref<Widget>)
  }

  $: tab?.id &&
    query.query(
      card.class.Card,
      { _id: tab.id as Ref<Card> },
      (res) => {
        if (res.length === 0) {
          closeWidget(card.ids.CardWidget as Ref<Widget>)
        } else {
          doc = res[0]
          if (!isTitleEditing) {
            title = doc.title
          }
        }
      },
      { limit: 1 }
    )

  $: tab?.id &&
    contextsQuery.query({ card: tab.id as Ref<Card>, limit: 1 }, (res) => {
      context = res.getResult()[0]
      isContextLoaded = true
    })

  async function saveTitle (ev: Event): Promise<void> {
    ev.preventDefault()
    isTitleEditing = false
    const client = getClient()
    const trimmedTitle = title.trim()
    const canSave = trimmedTitle.length > 0

    if (doc === undefined || !canSave) {
      title = doc?.title ?? title
      return
    }

    if (trimmedTitle !== doc.title) {
      await client.update(doc, { title: trimmedTitle })
    } else {
      title = doc.title
    }
  }

  let clientWidth = 0
</script>

{#if widget && tab?.id}
  <div class="card-widget" style:height bind:clientWidth>
    <Header type={'type-panel'} noPrint adaptive="disabled">
      <svelte:fragment slot="beforeTitle">
        <Button
          id={'btnPClose'}
          focusIndex={10001}
          icon={IconClose}
          iconProps={{ size: 'medium' }}
          kind={'icon'}
          noPrint
          on:click={() => {
            dispatch('close')
          }}
        />
      </svelte:fragment>

      <svelte:fragment slot="actions">
        <Button
          icon={IconMoreH}
          iconProps={{ size: 'medium' }}
          kind="icon"
          dataId="btnMoreActions"
          on:click={(e) => {
            showMenu(e, { object: doc })
          }}
        />
      </svelte:fragment>
      <div class="title flex-row-center">
        <EditBox
          focusIndex={1}
          bind:value={title}
          placeholder={card.string.Card}
          on:blur={saveTitle}
          on:value={() => {
            isTitleEditing = true
          }}
        />
      </div>
      <svelte:fragment slot="extra">
        {#if doc}
          <TagsEditor {doc} dropdownTags={clientWidth < 512} id={'cardSidebar-tags'} />
        {/if}
      </svelte:fragment>
    </Header>
    {#if doc}
      <EditCardNewContent _id={doc._id} {doc} {context} {isContextLoaded} />
    {/if}
  </div>
{/if}

<style lang="scss">
  .card-widget {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    min-height: 0;
  }

  .title {
    font-size: 1rem;
    flex: 1;
    min-width: 2rem;
  }
</style>
