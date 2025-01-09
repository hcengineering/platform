<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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
  import { Class, Doc, Hierarchy, Mixin, Ref } from '@hcengineering/core'
  import notification from '@hcengineering/notification'
  import { Panel } from '@hcengineering/panel'
  import { getResource } from '@hcengineering/platform'
  import {
    ActionContext,
    AttributesBar,
    KeyedAttribute,
    createQuery,
    getClient,
    hasResource,
    reduceCalls
  } from '@hcengineering/presentation'
  import { AnyComponent, Button, Component, IconMixin, IconMoreH } from '@hcengineering/ui'
  import view, { AttributeCategory } from '@hcengineering/view'
  import { createEventDispatcher, onDestroy } from 'svelte'

  import { DocNavLink, ParentsNavigator, getDocAttrsInfo, getDocLabel, getDocMixins, showMenu, parseLinkId } from '..'
  import { getCollectionCounter } from '../utils'
  import DocAttributeBar from './DocAttributeBar.svelte'

  export let _id: Ref<Doc> | string
  export let _class: Ref<Class<Doc>>
  export let embedded: boolean = false
  export let readonly: boolean = false
  export let selectedAside: boolean | undefined = undefined

  let realObjectClass: Ref<Class<Doc>> = _class
  let lastId: Ref<Doc> | undefined
  let objectId: Ref<Doc> | undefined
  let object: Doc

  const pClient = getClient()
  const hierarchy = pClient.getHierarchy()
  const inboxClient = getResource(notification.function.GetInboxNotificationsClient).then((res) => res())
  const linkProviders = pClient.getModel().findAllSync(view.mixin.LinkIdProvider, {})

  $: void parseLinkId(linkProviders, _id, _class).then((res) => {
    objectId = res ?? (_id as Ref<Doc>)
    if (lastId !== undefined) {
      return
    }
    lastId = objectId
  })

  $: read(objectId)

  function read (_id?: Ref<Doc>): void {
    if (objectId && lastId && lastId !== _id) {
      const prev = lastId
      lastId = _id
      void inboxClient.then(async (client) => {
        await client.readDoc(prev)
      })
    }
  }

  onDestroy(async () => {
    await inboxClient.then(async (client) => {
      if (objectId === undefined) return
      await client.readDoc(objectId)
    })
  })

  const query = createQuery()
  $: updateQuery(objectId, _class)

  function updateQuery (_id?: Ref<Doc>, _class?: Ref<Class<Doc>>): void {
    if (_id && _class) {
      query.query(_class, { _id }, (result) => {
        object = result[0]
        if (object != null) {
          realObjectClass = Hierarchy.mixinOrClass(object)
        }
      })
    } else {
      query.unsubscribe()
    }
  }

  let oldClass: Ref<Class<Doc>>

  $: if (_class !== oldClass) {
    oldClass = _class
    realObjectClass = _class
    mainEditor = undefined
    fieldEditors = []
  }

  let keys: KeyedAttribute[] = []
  let fieldEditors: Array<{ key: KeyedAttribute, editor: AnyComponent, category: AttributeCategory }> = []

  let mixins: Array<Mixin<Doc>> = []
  let showAllMixins = false

  const dispatch = createEventDispatcher()

  let ignoreKeys: string[] = []
  let activityOptions = { enabled: true, showInput: true }
  let allowedCollections: string[] = []
  let collectionArrays: string[] = []
  let inplaceAttributes: string[] = []
  let ignoreMixins: Set<Ref<Mixin<Doc>>> = new Set<Ref<Mixin<Doc>>>()

  $: mixins = getDocMixins(object, showAllMixins, ignoreMixins, realObjectClass)
  let attr: Promise<any> | undefined
  async function updateKeys (): Promise<void> {
    if (attr instanceof Promise) {
      await attr
    }
    attr = getDocAttrsInfo(mixins, ignoreKeys, realObjectClass, allowedCollections, collectionArrays)
    const info = await attr
    keys = info.keys
    inplaceAttributes = info.inplaceAttributes
    fieldEditors = info.editors
  }

  interface MixinEditor {
    editor: AnyComponent
    pinned?: boolean
  }

  function getEditor (_class: Ref<Class<Doc>>): MixinEditor {
    const clazz = hierarchy.getClass(_class)
    const editorMixin = hierarchy.as(clazz, view.mixin.ObjectEditor)
    if (editorMixin?.editor == null && clazz.extends != null) return getEditor(clazz.extends)
    return { editor: editorMixin.editor, pinned: editorMixin?.pinned }
  }

  function getEditorFooter (
    _class: Ref<Class<Doc>>,
    object?: Doc
  ): { footer: AnyComponent, props?: Record<string, any> } | undefined {
    if (object !== undefined) {
      const footer = hierarchy.findClassOrMixinMixin(object, view.mixin.ObjectEditorFooter)
      if (footer !== undefined) {
        return { footer: footer.editor, props: footer.props }
      }
    }

    return undefined
  }

  function getPanelFooter (
    _class: Ref<Class<Doc>>,
    object?: Doc
  ): { footer: AnyComponent, props?: Record<string, any> } | undefined {
    if (object !== undefined) {
      const footer = hierarchy.findClassOrMixinMixin(object, view.mixin.ObjectPanelFooter)
      if (footer !== undefined) {
        return { footer: footer.editor, props: footer.props }
      }
    }

    return undefined
  }

  let mainEditor: MixinEditor | undefined

  $: editorFooter = getEditorFooter(_class, object)
  $: panelFooter = getPanelFooter(_class, object)

  const getEditorOrDefault = reduceCalls(async function (_class: Ref<Class<Doc>>, _id?: Ref<Doc>): Promise<void> {
    if (objectId === undefined) return
    await updateKeys()
    mainEditor = getEditor(_class)
  })

  $: void getEditorOrDefault(realObjectClass, objectId)

  let title: string | undefined = undefined
  let rawTitle: string = ''

  $: if (object !== undefined) {
    void getDocLabel(pClient, object).then((t) => {
      if (t) {
        rawTitle = t
      }
    })
  }

  function getHeaderEditor (_class: Ref<Class<Doc>>): AnyComponent | undefined {
    const editorMixin = hierarchy.classHierarchyMixin(
      _class,
      view.mixin.ObjectEditorHeader,
      (m) => hasResource(m.editor) ?? false
    )
    return editorMixin?.editor
  }

  let headerEditor: AnyComponent | undefined = undefined
  $: headerEditor = getHeaderEditor(realObjectClass)

  const _update = (result: any): void => {
    dispatch('update', result)
  }
  let panelWidth: number = 0
  let innerWidth: number = 0

  function handleOpen (ev: CustomEvent): void {
    ignoreKeys = ev.detail.ignoreKeys
    activityOptions = ev.detail.activityOptions ?? activityOptions
    ignoreMixins = new Set(ev.detail.ignoreMixins)
    allowedCollections = ev.detail.allowedCollections ?? []
    collectionArrays = ev.detail.collectionArrays ?? []
    title = ev.detail.title
    mixins = getDocMixins(object, showAllMixins, ignoreMixins, realObjectClass)
    void updateKeys()
  }

  $: finalTitle = title ?? rawTitle
  let content: HTMLElement
</script>

{#if !embedded}
  <ActionContext
    context={{
      mode: 'editor'
    }}
  />
{/if}

{#if object !== undefined && finalTitle !== undefined}
  <Panel
    {object}
    isHeader={mainEditor?.pinned ?? false}
    allowClose={!embedded}
    isAside={true}
    {embedded}
    {selectedAside}
    bind:content
    bind:panelWidth
    bind:innerWidth
    on:open
    on:update={(ev) => {
      _update(ev.detail)
    }}
    on:close={() => {
      dispatch('close')
    }}
    withoutActivity={!activityOptions.enabled}
    withoutInput={!activityOptions.showInput || readonly}
  >
    <svelte:fragment slot="title">
      {#if !embedded}<ParentsNavigator element={object} />{/if}
      {#if embedded && object}
        <DocNavLink noUnderline {object}>
          <div class="title">{finalTitle}</div>
        </DocNavLink>
      {:else}<div class="title not-active">{finalTitle}</div>{/if}
    </svelte:fragment>

    <svelte:fragment slot="utils">
      {#if !readonly}
        <Button
          icon={IconMoreH}
          iconProps={{ size: 'medium' }}
          kind={'icon'}
          dataId={'btnMoreActions'}
          on:click={(e) => {
            showMenu(e, { object, excludedActions: [view.action.Open] })
          }}
        />
      {/if}
      <Button
        icon={IconMixin}
        iconProps={{ size: 'medium' }}
        kind={'icon'}
        selected={showAllMixins}
        dataId={'btnMixin'}
        on:click={() => {
          showAllMixins = !showAllMixins
        }}
      />
    </svelte:fragment>

    <svelte:fragment slot="attributes" let:direction={dir}>
      {#if headerEditor !== undefined && object._id === _id}
        <Component
          is={headerEditor}
          props={{
            object,
            keys,
            mixins,
            ignoreKeys,
            vertical: dir === 'column',
            allowedCollections,
            embedded,
            readonly
          }}
          on:update={updateKeys}
        />
      {:else if dir === 'column'}
        <DocAttributeBar
          {object}
          {mixins}
          {readonly}
          ignoreKeys={[...ignoreKeys, ...collectionArrays, ...inplaceAttributes]}
          {allowedCollections}
          on:update={updateKeys}
        />
      {:else}
        <AttributesBar {object} _class={realObjectClass} {keys} {readonly} />
      {/if}
    </svelte:fragment>

    <svelte:fragment slot="header">
      {#if mainEditor && mainEditor.editor && mainEditor.pinned}
        <div class="flex-col flex-grow my-4">
          <Component is={mainEditor.editor} props={{ object, readonly }} on:open={handleOpen} />
        </div>
      {/if}
    </svelte:fragment>

    {#if mainEditor && mainEditor.editor && !mainEditor.pinned}
      <div class="flex-col flex-grow flex-no-shrink step-tb-6">
        <Component is={mainEditor.editor} props={{ object, readonly }} on:open={handleOpen} />
      </div>
    {/if}

    {#each fieldEditors as collection}
      {#if collection.editor}
        <div class="step-tb-6">
          <Component
            is={collection.editor}
            props={{
              objectId: object._id,
              _class: collection.key.attr.attributeOf,
              object,
              space: object.space,
              key: collection.key,
              readonly,
              [collection.key.key]: getCollectionCounter(hierarchy, object, collection.key)
            }}
          />
        </div>
      {/if}
    {/each}

    {#if editorFooter}
      <div class="step-tb-6">
        <Component is={editorFooter.footer} props={{ object, _class, ...editorFooter.props, readonly }} />
      </div>
    {/if}

    <svelte:fragment slot="panel-footer">
      {#if panelFooter}
        <Component is={panelFooter.footer} props={{ object, _class, ...panelFooter.props, readonly }} />
      {/if}
    </svelte:fragment>
  </Panel>
{/if}
