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
  import { Analytics } from '@hcengineering/analytics'
  import { Attachments } from '@hcengineering/attachment-resources'
  import { Card, CardEvents } from '@hcengineering/card'
  import { Doc, Mixin, Ref, WithLookup } from '@hcengineering/core'
  import notification from '@hcengineering/notification'
  import { Panel } from '@hcengineering/panel'
  import { getResource } from '@hcengineering/platform'
  import { ComponentExtensions, createQuery, getClient } from '@hcengineering/presentation'
  import {
    Button,
    EditBox,
    FocusHandler,
    IconMoreH,
    createFocusManager,
    getCurrentLocation,
    navigate
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { ParentsNavigator, RelationsEditor, getDocMixins, showMenu } from '@hcengineering/view-resources'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import card from '../plugin'
  import CardAttributeEditor from './CardAttributeEditor.svelte'
  import CardPresenter from './CardPresenter.svelte'
  import Childs from './Childs.svelte'
  import Content from './Content.svelte'
  import TagsEditor from './TagsEditor.svelte'

  export let _id: Ref<Card>
  export let readonly: boolean = false
  export let embedded: boolean = false

  let useMaxWidth = getUseMaxWidth()
  $: saveUseMaxWidth(useMaxWidth)

  export function canClose (): boolean {
    return false
  }

  let lastId: Ref<Doc> = _id
  const query = createQuery()
  const dispatch = createEventDispatcher()
  const client = getClient()

  let doc: WithLookup<Card> | undefined
  let title = ''
  let innerWidth: number

  const notificationClient = getResource(notification.function.GetInboxNotificationsClient).then((res) => res())

  $: read(_id)
  function read (_id: Ref<Doc>): void {
    if (lastId !== _id) {
      const prev = lastId
      lastId = _id
      void notificationClient.then((client) => client.readDoc(prev))
    }
  }

  onDestroy(async () => {
    void notificationClient.then((client) => client.readDoc(_id))
  })

  $: _id !== undefined &&
    query.query(card.class.Card, { _id }, async (result) => {
      if (result.length > 0) {
        ;[doc] = result
        title = doc?.title ?? ''
      } else {
        const loc = getCurrentLocation()
        loc.path.length = 3
        navigate(loc)
      }
    })

  $: canSave = title.trim().length > 0

  async function saveTitle (ev: Event): Promise<void> {
    ev.preventDefault()

    if (doc === undefined || !canSave) {
      return
    }

    const nameTrimmed = title.trim()

    if (nameTrimmed.length > 0 && nameTrimmed !== doc.title) {
      await client.update(doc, { title: nameTrimmed })
    }
  }

  function getUseMaxWidth (): boolean {
    const useMaxWidth = localStorage.getItem('document.useMaxWidth')
    return useMaxWidth === 'true'
  }

  function saveUseMaxWidth (useMaxWidth: boolean): void {
    localStorage.setItem('document.useMaxWidth', useMaxWidth.toString())
  }

  onMount(() => {
    Analytics.handleEvent(CardEvents.CardOpened, { id: _id })
  })

  let content: HTMLElement

  const manager = createFocusManager()

  let mixins: Array<Mixin<Doc>> = []

  $: mixins = doc !== undefined ? getDocMixins(doc) : []
</script>

<FocusHandler {manager} />

{#if doc !== undefined}
  <Panel
    object={doc}
    allowClose={!embedded}
    isAside={false}
    isHeader={false}
    isSub={false}
    bind:useMaxWidth
    printHeader={false}
    {embedded}
    adaptive={'default'}
    bind:content
    bind:innerWidth
    floatAside={false}
    on:open
    on:close={() => dispatch('close')}
  >
    <svelte:fragment slot="title">
      <ParentsNavigator element={doc} />
      <CardPresenter value={doc} noUnderline />
    </svelte:fragment>

    <div class="container">
      <div class="title flex-row-center">
        <EditBox focusIndex={1} bind:value={title} placeholder={card.string.Card} on:blur={(evt) => saveTitle(evt)} />
      </div>

      <TagsEditor {doc} />

      <CardAttributeEditor value={doc} {mixins} {readonly} ignoreKeys={['title', 'content', 'parent']} />

      <ComponentExtensions
        extension={card.extensions.EditCardExtension}
        props={{
          card: doc
        }}
      />

      <Content {doc} {readonly} bind:content />
    </div>

    <Childs object={doc} {readonly} />
    <RelationsEditor object={doc} {readonly} />

    <Attachments objectId={doc._id} _class={doc._class} space={doc.space} attachments={doc.attachments ?? 0} />

    <svelte:fragment slot="utils">
      {#if !readonly}
        <Button
          icon={IconMoreH}
          iconProps={{ size: 'medium' }}
          kind={'icon'}
          dataId={'btnMoreActions'}
          on:click={(e) => {
            showMenu(e, { object: doc, excludedActions: [view.action.Open] })
          }}
        />
      {/if}
    </svelte:fragment>
  </Panel>
{/if}

<style lang="scss">
  .container {
    display: flex;
    flex-direction: column;
    width: 100%;
    margin: auto;
  }
  .title {
    font-size: 2.25rem;
    margin-top: 1.75rem;
    margin-bottom: 1rem;
  }
</style>
