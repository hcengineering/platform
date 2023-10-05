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
  import contact, { Contact, getName } from '@hcengineering/contact'
  import core, { Class, ClassifierKind, Doc, Mixin, Obj, Ref } from '@hcengineering/core'
  import notification from '@hcengineering/notification'
  import { Panel } from '@hcengineering/panel'
  import { Channel } from '@hcengineering/contact'
  import { Asset, getResource, translate } from '@hcengineering/platform'
  import {
    AttributeCategory,
    AttributeCategoryOrder,
    KeyedAttribute,
    ActionContext,
    createQuery,
    getAttributePresenterClass,
    getClient
  } from '@hcengineering/presentation'
  import {
    AnyComponent,
    AnySvelteComponent,
    Button,
    Component,
    IconMixin,
    IconMoreH,
    showPopup,
    themeStore,
    TabList,
    TabItem
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import plugin from '../plugin'
  import { ContextMenu, ParentsNavigator } from '..'
  import { categorizeFields, getCollectionCounter, getFiltredKeys } from '../utils'
  import UpDownNavigator from './UpDownNavigator.svelte'

  export let _id: Ref<Doc>
  export let _class: Ref<Class<Doc>>
  export let embedded = false

  let realObjectClass: Ref<Class<Doc>> = _class
  let lastId: Ref<Doc> = _id
  let object: Doc
  let channels: Channel[] = []

  export let mode: string = 'mail'

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const notificationClient = getResource(notification.function.GetNotificationClient).then((res) => res())

  $: read(_id)
  function read (_id: Ref<Doc>) {
    if (lastId !== _id) {
      const prev = lastId
      lastId = _id
      notificationClient.then((client) => client.read(prev))
    }
  }

  onDestroy(async () => {
    notificationClient.then((client) => client.read(_id))
  })

  const query = createQuery()
  const channelQuery = createQuery()

  $: updateQuery(_id, _class)

  function updateQuery (_id: Ref<Doc>, _class: Ref<Class<Doc>>) {
    if (_id && _class) {
      query.query(_class, { _id }, (result) => {
        object = result[0]
        if (object != null) {
          realObjectClass = object._class
        }
      })
    } else {
      query.unsubscribe()
    }
  }

  let oldClass: Ref<Class<Doc>>

  $: if (_class !== oldClass) {
    oldClass = _class
    mainEditor = undefined
  }

  let fieldEditors: { key: KeyedAttribute; editor: AnyComponent; category: AttributeCategory }[] = []

  let mixins: Mixin<Doc>[] = []

  let showAllMixins = false

  const dispatch = createEventDispatcher()

  function getMixins (object: Doc, showAllMixins: boolean): void {
    if (object === undefined) return
    const descendants = hierarchy.getDescendants(core.class.Doc).map((p) => hierarchy.getClass(p))

    mixins = descendants.filter(
      (m) =>
        m.kind === ClassifierKind.MIXIN &&
        !ignoreMixins.has(m._id) &&
        (hierarchy.hasMixin(object, m._id) ||
          (showAllMixins &&
            hierarchy.isDerived(realObjectClass, hierarchy.getBaseClass(m._id)) &&
            (m.extends && hierarchy.isMixin(m.extends) ? hierarchy.hasMixin(object, m.extends) : true)))
    )
  }

  $: getMixins(object, showAllMixins)

  const ignoreKeys: string[] = []
  const activityOptions = { enabled: false, showInput: false }
  const allowedCollections: string[] = []
  const collectionArrays: string[] = []
  const ignoreMixins: Set<Ref<Mixin<Doc>>> = new Set<Ref<Mixin<Doc>>>()

  async function updateKeys (): Promise<void> {
    const keysMap = new Map(getFiltredKeys(hierarchy, realObjectClass, ignoreKeys).map((p) => [p.attr._id, p]))
    for (const m of mixins) {
      const mkeys = getFiltredKeys(hierarchy, m._id, ignoreKeys)
      for (const key of mkeys) {
        keysMap.set(key.attr._id, key)
      }
    }
    const filtredKeys = Array.from(keysMap.values())
    const { collections } = categorizeFields(hierarchy, filtredKeys, collectionArrays, allowedCollections)

    const editors: { key: KeyedAttribute; editor: AnyComponent; category: AttributeCategory }[] = []
    for (const k of collections) {
      if (allowedCollections.includes(k.key.key)) continue
      const editor = await getFieldEditor(k.key)
      if (editor === undefined) continue
      editors.push({ key: k.key, editor, category: k.category })
    }
    fieldEditors = editors.sort((a, b) => AttributeCategoryOrder[a.category] - AttributeCategoryOrder[b.category])
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

  let mainEditor: MixinEditor | undefined

  $: getEditorOrDefault(realObjectClass, _id)

  async function getEditorOrDefault (_class: Ref<Class<Doc>>, _id: Ref<Doc>): Promise<void> {
    await updateKeys()
    mainEditor = getEditor(_class)
  }

  async function getFieldEditor (key: KeyedAttribute): Promise<AnyComponent | undefined> {
    const attrClass = getAttributePresenterClass(hierarchy, key.attr)
    const clazz = hierarchy.getClass(attrClass.attrClass)
    const mix = {
      array: view.mixin.ArrayEditor,
      collection: view.mixin.CollectionEditor,
      inplace: view.mixin.InlineAttributEditor,
      attribute: view.mixin.AttributeEditor,
      object: undefined
    }
    const mixinRef = mix[attrClass.category]
    if (mixinRef) {
      const editorMixin = hierarchy.as(clazz, mixinRef)
      return (editorMixin as any).editor
    } else {
      return undefined
    }
  }

  function getIcon (_class: Ref<Class<Obj>> | undefined): Asset | undefined {
    if (_class === undefined) return undefined
    let clazz = hierarchy.getClass(_class)
    if (clazz.icon !== undefined) return clazz.icon
    while (clazz.extends !== undefined) {
      clazz = hierarchy.getClass(clazz.extends)
      if (clazz.icon != null) {
        return clazz.icon
      }
    }
    // throw new Error(`Icon not found for ${_class}`)
  }

  $: icon = getIcon(realObjectClass)

  const title: string = ''
  let rawTitle: string = ''

  $: if (object !== undefined) {
    getTitle(object).then((t) => {
      rawTitle = t
    })
  }

  async function getTitle (object: Doc): Promise<string> {
    const name = (object as any).name
    if (name !== undefined) {
      if (hierarchy.isDerived(object._class, contact.class.Person)) {
        return getName(client.getHierarchy(), object as Contact)
      }
      return name
    }
    const label = hierarchy.getClass(object._class).label
    return await translate(label, {}, $themeStore.language)
  }

  const _update = (result: any): void => {
    dispatch('update', result)
  }
  let panelWidth: number = 0
  let innerWidth: number = 0

  function showMenu (ev?: Event): void {
    if (object !== undefined) {
      showPopup(ContextMenu, { object, excludedActions: [view.action.Open] }, (ev as MouseEvent).target as HTMLElement)
    }
  }

  $: finalTitle = title ?? rawTitle

  const handleViewModeChanged = async (newMode: string) => {
    if (newMode === undefined || (newMode === mode && currentResource !== undefined)) return
    mode = newMode
    currentResource = await getResource(presenterList[newMode].presenter)
  }

  const modeList: TabItem[] = [
    { id: 'mail', labelIntl: plugin.string.Mail, action: () => handleViewModeChanged('mail') },
    // { id: 'messages', labelIntl: plugin.string.Messages, action: () => handleViewModeChanged('messages') },
    // { id: 'notes', labelIntl: plugin.string.Notes, action: () => handleViewModeChanged('notes') },
    { id: 'activity', labelIntl: plugin.string.Activity, action: () => handleViewModeChanged('activity') }
  ]

  let currentResource: AnySvelteComponent | undefined
  let presenterListProps: any = undefined

  $: {
    handleViewModeChanged(mode)
    presenterListProps = presenterList[mode]?.props
  }

  $: if (lastId) {
    channelQuery.query(contact.class.Channel, { attachedTo: lastId }, (res) => {
      if (res && res.length > 0) {
        channels = res
      }
    })
  }

  let presenterList: any = {
    mail: { presenter: 'gmail:component:Main', props: { channel: {} } },
    activity: { presenter: 'activity:component:Activity', props: { object: {} } }
  }
  $: presenterList = {
    mail: { presenter: 'gmail:component:Main', props: { channel: channels[0] || {} } },
    activity: { presenter: 'activity:component:Activity', props: { object: object || {} } }
  }
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
    {icon}
    title={finalTitle}
    {object}
    {embedded}
    isHeader={mainEditor?.pinned ?? false}
    isAside={true}
    bind:panelWidth
    bind:innerWidth
    on:open
    on:update={(ev) => _update(ev.detail)}
    on:close={() => {
      dispatch('close')
    }}
    withoutActivity={!activityOptions.enabled}
    withoutInput={!activityOptions.showInput}
  >
    <svelte:fragment slot="navigator">
      {#if !embedded}
        <UpDownNavigator element={object} />
        <ParentsNavigator element={object} />
      {/if}
    </svelte:fragment>

    <svelte:fragment slot="utils">
      <Button icon={IconMoreH} kind={'ghost'} size={'medium'} on:click={showMenu} />
      <Button
        icon={IconMixin}
        kind={'ghost'}
        selected={showAllMixins}
        on:click={() => {
          showAllMixins = !showAllMixins
        }}
      />
    </svelte:fragment>

    <TabList selected={mode} items={modeList} on:select={({ detail }) => handleViewModeChanged(detail.id)} />

    <div class="my-component">
      {#if currentResource && presenterList && (channels.length > 0 || object !== undefined)}
        <svelte:component this={currentResource} {...presenterListProps} />
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
                [collection.key.key]: getCollectionCounter(hierarchy, object, collection.key)
              }}
            />
          </div>
        {/if}
      {/each}
    </div>
  </Panel>
{/if}

<style lang="scss">
  .my-component {
    margin: 1.25rem 0 1.25rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
</style>
