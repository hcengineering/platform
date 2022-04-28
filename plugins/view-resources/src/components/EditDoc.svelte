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
  import contact, { ChannelProvider, formatName } from '@anticrm/contact'
  import core, { Class, ClassifierKind, Doc, getCurrentAccount, Hierarchy, Mixin, Obj, Ref, Space } from '@anticrm/core'
  import notification from '@anticrm/notification'
  import { Panel } from '@anticrm/panel'
  import { Asset, getResource, IntlString, translate } from '@anticrm/platform'
  import {
    AttributesBar,
    createQuery,
    getAttributePresenterClass,
    getClient,
    KeyedAttribute
  } from '@anticrm/presentation'
  import setting, { IntegrationType } from '@anticrm/setting'
  import { AnyComponent, Button, Component, IconActivity } from '@anticrm/ui'
  import Tooltip from '@anticrm/ui/src/components/Tooltip.svelte'
  import view from '@anticrm/view'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import { getCollectionCounter } from '../utils'
  import ActionContext from './ActionContext.svelte'
  import UpDownNavigator from './UpDownNavigator.svelte'

  export let _id: Ref<Doc>
  export let _class: Ref<Class<Doc>>
  export let rightSection: AnyComponent | undefined = undefined
  // export let position: PopupAlignment | undefined = undefined

  let lastId: Ref<Doc> = _id
  let lastClass: Ref<Class<Doc>> = _class
  let object: Doc
  let objectClass: Class<Doc>
  let parentClass: Ref<Class<Doc>>

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const notificationClient = getResource(notification.function.GetNotificationClient).then((res) => res())

  const docKeys: Set<string> = new Set<string>(hierarchy.getAllAttributes(core.class.AttachedDoc).keys())

  $: read(_id)
  function read (_id: Ref<Doc>) {
    if (lastId !== _id) {
      const prev = lastId
      const prevClass = lastClass
      lastId = _id
      lastClass = _class
      notificationClient.then((client) => client.updateLastView(prev, prevClass))
    }
  }

  onDestroy(async () => {
    notificationClient.then((client) => client.updateLastView(_id, _class))
  })

  const query = createQuery()
  $: _id &&
    _class &&
    query.query(_class, { _id }, (result) => {
      object = result[0]
    })

  $: if (object !== undefined) objectClass = hierarchy.getClass(object._class)

  let selectedClass: Ref<Class<Doc>> | undefined
  let prevSelected = selectedClass

  let keys: KeyedAttribute[] = []
  let collectionEditors: { key: KeyedAttribute; editor: AnyComponent }[] = []

  let mixins: Mixin<Doc>[] = []

  $: if (object && prevSelected !== object._class) {
    prevSelected = object._class
    selectedClass = Hierarchy.mixinOrClass(object)

    parentClass = getParentClass(object._class)
    getMixins()
  }

  const dispatch = createEventDispatcher()

  function getMixins (): void {
    const descendants = hierarchy.getDescendants(parentClass).map((p) => hierarchy.getClass(p))
    mixins = descendants.filter(
      (m) => m.kind === ClassifierKind.MIXIN && hierarchy.hasMixin(object, m._id) && !ignoreMixins.has(m._id)
    )
  }

  function filterKeys (keys: KeyedAttribute[], ignoreKeys: string[]): KeyedAttribute[] {
    keys = keys.filter((k) => !docKeys.has(k.key))
    keys = keys.filter((k) => !ignoreKeys.includes(k.key))
    return keys
  }

  function getFiltredKeys (objectClass: Ref<Class<Doc>>, ignoreKeys: string[], to?: Ref<Class<Doc>>): KeyedAttribute[] {
    const keys = [...hierarchy.getAllAttributes(objectClass, to).entries()]
      .filter(([, value]) => value.hidden !== true)
      .map(([key, attr]) => ({ key, attr }))

    return filterKeys(keys, ignoreKeys)
  }

  let ignoreKeys: string[] = []
  let ignoreMixins: Set<Ref<Mixin<Doc>>> = new Set<Ref<Mixin<Doc>>>()

  async function updateKeys (): Promise<void> {
    const filtredKeys = getFiltredKeys(selectedClass ?? object._class, ignoreKeys)
    keys = collectionsFilter(filtredKeys, false)

    const collectionKeys = collectionsFilter(filtredKeys, true)
    const editors: { key: KeyedAttribute; editor: AnyComponent }[] = []
    for (const k of collectionKeys) {
      const editor = await getCollectionEditor(k)
      editors.push({ key: k, editor })
    }
    collectionEditors = editors
  }

  function collectionsFilter (keys: KeyedAttribute[], get: boolean): KeyedAttribute[] {
    const result: KeyedAttribute[] = []
    for (const key of keys) {
      if (isCollectionAttr(key) === get) result.push(key)
    }
    return result
  }

  function isCollectionAttr (key: KeyedAttribute): boolean {
    return hierarchy.isDerived(key.attr.type._class, core.class.Collection)
  }

  async function getEditor (_class: Ref<Class<Doc>>): Promise<AnyComponent> {
    const clazz = hierarchy.getClass(_class)
    const editorMixin = hierarchy.as(clazz, view.mixin.ObjectEditor)
    if (editorMixin?.editor == null && clazz.extends != null) return getEditor(clazz.extends)
    return editorMixin.editor
  }

  let mainEditor: AnyComponent

  $: if (object) getEditorOrDefault(selectedClass, object._class)

  async function getEditorOrDefault (_class: Ref<Class<Doc>> | undefined, defaultClass: Ref<Class<Doc>>): Promise<void> {
    let editor = _class !== undefined ? await getEditor(_class) : undefined
    if (editor === undefined) {
      editor = await getEditor(defaultClass)
    }
    mainEditor = editor
    updateKeys()
    getMixins()
  }

  async function getCollectionEditor (key: KeyedAttribute): Promise<AnyComponent> {
    const attrClass = getAttributePresenterClass(key.attr)
    const clazz = client.getHierarchy().getClass(attrClass)
    const editorMixin = client.getHierarchy().as(clazz, view.mixin.AttributeEditor)
    return editorMixin.editor
  }

  function getIcon (_class: Ref<Class<Obj>>): Asset {
    let clazz = hierarchy.getClass(_class)
    if (clazz.icon !== undefined) return clazz.icon
    while (clazz.extends !== undefined) {
      clazz = hierarchy.getClass(clazz.extends)
      if (clazz.icon !== undefined) {
        return clazz.icon
      }
    }
    throw new Error(`Icon not found for ${_class}`)
  }

  $: icon = object && getIcon(object._class)

  function getParentClass (_class: Ref<Class<Doc>>): Ref<Class<Doc>> {
    const baseDomain = hierarchy.getDomain(_class)
    const ancestors = hierarchy.getAncestors(_class)
    let result: Ref<Class<Doc>> = _class
    for (const ancestor of ancestors) {
      try {
        const domain = hierarchy.getClass(ancestor).domain
        if (domain === baseDomain) {
          result = ancestor
        }
      } catch {}
    }
    return result
  }

  let title: string = ''

  $: if (object !== undefined) {
    getTitle(object).then((t) => {
      title = t
    })
  }

  async function getTitle (object: Doc): Promise<string> {
    const name = (object as any).name
    if (name !== undefined) {
      if (hierarchy.isDerived(object._class, contact.class.Person)) {
        return formatName(name)
      }
      return name
    }
    const label = hierarchy.getClass(object._class).label
    return await translate(label, {})
  }

  async function getHeaderEditor (_class: Ref<Class<Doc>>): Promise<AnyComponent | undefined> {
    const clazz = hierarchy.getClass(_class)
    const editorMixin = hierarchy.as(clazz, view.mixin.ObjectEditorHeader)
    if (editorMixin.editor != null) return editorMixin.editor
    if (clazz.extends != null) return getHeaderEditor(clazz.extends)
  }

  let headerEditor: AnyComponent | undefined = undefined
  let headerLoading = false
  $: if (object !== undefined) {
    headerLoading = true
    getHeaderEditor(object._class).then((r) => {
      headerEditor = r
      headerLoading = false
    })
  }

  const _update = (result: any): void => {
    dispatch('update', result)
  }
  let panelWidth: number = 0
  let innerWidth: number = 0

  const accountId = getCurrentAccount()._id
  let channelProviders: ChannelProvider[] | undefined
  let currentProviders: ChannelProvider[] | undefined
  let integrations: Set<Ref<IntegrationType>> = new Set<Ref<IntegrationType>>()
  let displayedIntegrations:
    | {
        icon: Asset | undefined
        label: IntlString
        presenter: AnyComponent | undefined
        value: string
      }[]
    | undefined = []

  client.findAll(contact.class.ChannelProvider, {}).then((res) => {
    channelProviders = res
  })
  const settingsQuery = createQuery()
  $: settingsQuery.query(
    setting.class.Integration,
    { space: accountId as string as Ref<Space>, disabled: false },
    (res) => {
      integrations = new Set(res.map((p) => p.type))
    }
  )
  const channelsQuery = createQuery()
  $: _id &&
    integrations &&
    channelProviders &&
    channelsQuery.query(contact.class.Channel, { attachedTo: _id }, (res) => {
      const channels = res
      currentProviders = channelProviders?.filter((provider) =>
        provider.integrationType ? integrations.has(provider.integrationType as Ref<IntegrationType>) : false
      )
      displayedIntegrations = []
      currentProviders?.forEach((provider) => {
        displayedIntegrations?.push({
          icon: provider.icon,
          label: provider.label,
          presenter: provider.presenter,
          value: channels.filter((ch) => ch.provider === provider._id)[0].value
        })
      })
    })
</script>

<ActionContext
  context={{
    mode: 'editor'
  }}
/>

{#if object !== undefined && title !== undefined}
  <Panel
    {icon}
    {title}
    {rightSection}
    {object}
    bind:panelWidth
    bind:innerWidth
    on:update={(ev) => _update(ev.detail)}
    on:close={() => {
      dispatch('close')
    }}
  >
    <svelte:fragment slot="navigate-actions">
      <UpDownNavigator element={object} />
    </svelte:fragment>
    <svelte:fragment slot="subtitle">
      {#if !headerLoading}
        {#if headerEditor !== undefined}
          <Component is={headerEditor} props={{ object, keys }} />
        {:else}
          <AttributesBar {object} {keys} />
        {/if}
      {/if}
    </svelte:fragment>
    <svelte:fragment slot="properties">
      {#if !headerLoading}
        <div class="p-4">
          {#if headerEditor !== undefined}
            <Component is={headerEditor} props={{ object, keys, vertical: true }} />
          {:else}
            <AttributesBar {object} {keys} vertical />
          {/if}
        </div>
      {/if}
    </svelte:fragment>
    <svelte:fragment slot="actions">
      {#if displayedIntegrations && displayedIntegrations.length > 0}
        <div class="actions-divider" />
        {#each displayedIntegrations as pr}
          <Tooltip label={pr.label}>
            <Button
              icon={pr.icon}
              size={'medium'}
              kind={'transparent'}
              highlight={rightSection === pr.presenter}
              on:click={() => {
                if (rightSection !== pr.presenter) rightSection = pr.presenter
              }}
            />
          </Tooltip>
        {/each}
        <Button
          icon={IconActivity}
          size={'medium'}
          kind={'transparent'}
          highlight={!rightSection}
          on:click={() => {
            if (rightSection) rightSection = undefined
          }}
        />
      {/if}
    </svelte:fragment>
    <div class="main-editor">
      {#if mainEditor}
        <Component
          is={mainEditor}
          props={{ object }}
          on:open={(ev) => {
            ignoreKeys = ev.detail.ignoreKeys
            ignoreMixins = new Set(ev.detail.ignoreMixins)
            updateKeys()
            getMixins()
          }}
          on:click={(ev) => {
            rightSection = ev.detail.presenter
          }}
        />
      {/if}
    </div>
    {#each collectionEditors as collection}
      {#if collection.editor}
        <div class="mt-14">
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
  </Panel>
{/if}

<style lang="scss">
  .main-editor {
    display: flex;
    justify-content: center;
    flex-direction: column;
  }

  .actions-divider {
    margin: 0 0.25rem;
    min-width: 1px;
    width: 1px;
    height: 1.5rem;
    background-color: var(--divider-color);
  }
</style>
