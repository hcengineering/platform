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
  import { Attachments } from '@hcengineering/attachment-resources'
  import { Card } from '@hcengineering/card'
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
    navigate,
    deviceOptionsStore as deviceInfo
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import {
    ParentsNavigator,
    RelationsEditor,
    canChangeDoc,
    getDocMixins,
    showMenu
  } from '@hcengineering/view-resources'
  import { createEventDispatcher, onDestroy } from 'svelte'

  import card from '../plugin'
  import CardAttributeEditor from './CardAttributeEditor.svelte'
  import CardIcon from './CardIcon.svelte'
  import Childs from './Childs.svelte'
  import Content from './Content.svelte'
  import TagsEditor from './TagsEditor.svelte'
  import ParentNamesPresenter from './ParentNamesPresenter.svelte'
  import { permissionsStore } from '@hcengineering/contact-resources'

  export let _id: Ref<Card>
  export let readonly: boolean = false
  export let embedded: boolean = false

  let useMaxWidth = getUseMaxWidth()
  $: saveUseMaxWidth(useMaxWidth)

  let lastId: Ref<Doc> = _id
  const query = createQuery()
  const dispatch = createEventDispatcher()

  let doc: WithLookup<Card> | undefined
  let title: string = ''
  let isTitleEditing = false
  let prevId: Ref<Card> = _id

  let innerWidth: number

  $: if (prevId !== _id) {
    prevId = _id
    isTitleEditing = false
  }

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
        if (!isTitleEditing) {
          title = doc.title ?? ''
        }
      } else {
        const loc = getCurrentLocation()
        loc.path.length = 3
        navigate(loc)
      }
    })

  $: _readonly = (readonly || doc?.readonly) ?? false
  $: updatePermissionForbidden = doc && !canChangeDoc(doc?._class, doc?.space, $permissionsStore)
  $: canSave = title.trim().length > 0 && !_readonly

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

  function getUseMaxWidth (): boolean {
    const useMaxWidth = localStorage.getItem('document.useMaxWidth')
    return useMaxWidth === 'true'
  }

  function saveUseMaxWidth (useMaxWidth: boolean): void {
    localStorage.setItem('document.useMaxWidth', useMaxWidth.toString())
  }

  let content: HTMLElement

  const manager = createFocusManager()

  let mixins: Array<Mixin<Doc>> = []

  $: mixins = doc !== undefined ? getDocMixins(doc) : []

  const expandedParents: boolean = !$deviceInfo.isMobile
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
    <svelte:fragment slot="beforeTitle">
      <CardIcon value={doc} />
    </svelte:fragment>

    <svelte:fragment slot="title">
      <ParentNamesPresenter value={doc} maxWidth={'12rem'} compact={!expandedParents} />
      <div class="title flex-row-center">
        {#if !_readonly}
          <EditBox
            focusIndex={1}
            bind:value={title}
            disabled={_readonly || updatePermissionForbidden}
            placeholder={card.string.Card}
            on:blur={(evt) => saveTitle(evt)}
            on:value={() => {
              isTitleEditing = true
            }}
          />
        {:else}
          {doc.title}
        {/if}
      </div></svelte:fragment
    >

    <div class="container">
      <CardAttributeEditor value={doc} {mixins} readonly={_readonly} ignoreKeys={['title', 'content', 'parent']} />

      <Content {doc} readonly={_readonly || updatePermissionForbidden} bind:content />
    </div>

    <ComponentExtensions
      extension={card.extensions.EditCardExtension}
      props={{
        card: doc
      }}
    />

    <Childs object={doc} readonly={_readonly} />
    <RelationsEditor object={doc} readonly={_readonly} />

    <Attachments
      objectId={doc._id}
      _class={doc._class}
      space={doc.space}
      readonly={_readonly}
      attachments={doc.attachments ?? 0}
    />

    <svelte:fragment slot="extra">
      <TagsEditor {doc} id={'cardHeader-tags'} />
      <ComponentExtensions
        extension={card.extensions.EditCardHeaderExtension}
        props={{
          card: doc
        }}
      />
      <slot name="extra" />
    </svelte:fragment>

    <svelte:fragment slot="utils">
      {#if !_readonly}
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
    font-size: 1rem;
    flex: 1;
    min-width: 2rem;
  }
</style>
