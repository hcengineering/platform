<!--
//
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { AttachmentStyleBoxEditor } from '@hcengineering/attachment-resources'
  import core, { type Class, type Doc, type Ref, getCurrentAccount } from '@hcengineering/core'
  import { includesAny } from '@hcengineering/contact'
  import { checkMyPermission, permissionsStore } from '@hcengineering/contact-resources'
  import notification from '@hcengineering/notification'
  import { Panel } from '@hcengineering/panel'
  import { getResource } from '@hcengineering/platform'
  import { ActionContext, MessageViewer, createQuery, getClient } from '@hcengineering/presentation'
  import {
    Button,
    EditBox,
    IconMixin,
    IconMoreH,
    IconWithEmoji,
    getPlatformColorDef,
    showPopup,
    themeStore
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { DocAttributeBar, IconPicker, getDocMixins, showMenu } from '@hcengineering/view-resources'
  import type { Product } from '@hcengineering/products'
  import { createEventDispatcher, onDestroy } from 'svelte'

  import products from '../../plugin'
  import ProductVersionsEditor from '../product-version/ProductVersionsEditor.svelte'
  import DocIcon from '../DocIcon.svelte'

  export let _id: Ref<Product>
  export let _class: Ref<Class<Product>>
  export let readonly: boolean = false

  const client = getClient()
  const dispatch = createEventDispatcher()
  const notificationClient = getResource(notification.function.GetInboxNotificationsClient).then((res) => res())

  let object: Product | undefined
  let title = ''
  let showAllMixins = false

  let lastId: Ref<Doc> = _id
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

  const query = createQuery()

  $: _id !== undefined &&
    _class !== undefined &&
    query.query(_class, { _id }, async (result) => {
      ;[object] = result
      if (object !== undefined) {
        title = object.name
      }
    })

  function chooseIcon (): void {
    if (object === undefined) return

    const { icon, color } = object
    const icons = [products.icon.Product]
    const update = async (result: any): Promise<void> => {
      if (result !== undefined && result !== null && object !== undefined) {
        await client.update(object, { icon: result.icon, color: result.color })
      }
    }
    showPopup(IconPicker, { icon, color, icons }, 'top', update, update)
  }

  function onChange (key: string, value: any): void {
    if (object === undefined) return

    if (value !== (object as any)[key]) {
      void client.updateDoc(object._class, object.space, object._id, { [key]: value })
    }
  }

  $: canEdit =
    !readonly &&
    object !== undefined &&
    !object.archived &&
    (includesAny(object.owners ?? [], getCurrentAccount().socialIds) ||
      checkMyPermission(core.permission.UpdateSpace, _id, $permissionsStore) ||
      checkMyPermission(core.permission.UpdateObject, core.space.Space, $permissionsStore))

  $: descriptionKey = client.getHierarchy().getAttribute(products.class.Product, 'fullDescription')
  $: otherSpaceTypesMixins = new Set(
    object !== undefined
      ? client
        .getModel()
        .findAllSync(
          core.class.SpaceType,
          {
            _id: { $ne: object.type }
          },
          {
            projection: { targetClass: 1 }
          }
        )
        ?.map((st) => st.targetClass) ?? []
      : []
  )
  $: mixins =
    object !== undefined ? getDocMixins(object, showAllMixins).filter((m) => !otherSpaceTypesMixins.has(m._id)) : []
</script>

{#if object !== undefined}
  <ActionContext context={{ mode: 'editor' }} />

  <Panel
    {object}
    title={object.name}
    isHeader={false}
    isAside={true}
    isSub={false}
    adaptive={'default'}
    on:open
    on:close={() => dispatch('close')}
  >
    <div class="flex-row-center clear-mins" style="gap: 1.5rem;">
      {#if canEdit}
        <Button
          size={'medium'}
          kind={'link-bordered'}
          noFocus
          icon={object.icon === view.ids.IconWithEmoji ? IconWithEmoji : object.icon ?? products.icon.Product}
          iconProps={object.icon === view.ids.IconWithEmoji
            ? { icon: object.color }
            : {
                fill:
                  object.color !== undefined ? getPlatformColorDef(object.color, $themeStore.dark).icon : 'currentColor'
              }}
          on:click={chooseIcon}
        />
      {:else}
        <div class="icon">
          <DocIcon value={object} size={'small'} defaultIcon={products.icon.Product} />
        </div>
      {/if}
      <EditBox
        bind:value={title}
        disabled={!canEdit}
        placeholder={products.string.ProductNamePlaceholder}
        kind={'large-style'}
        on:blur={() => {
          const name = title.trim()
          if (name !== '') {
            onChange('name', name)
          }
        }}
      />
    </div>

    <div class="w-full mt-6">
      {#if canEdit}
        <AttachmentStyleBoxEditor
          focusIndex={30}
          {object}
          key={{ key: 'fullDescription', attr: descriptionKey }}
          placeholder={core.string.Description}
        />
      {:else}
        <MessageViewer message={object.fullDescription ?? ''} />
      {/if}
    </div>

    <div class="w-full mt-6">
      <ProductVersionsEditor objectId={object._id} readonly={!canEdit} />
    </div>

    <svelte:fragment slot="utils">
      <Button
        icon={IconMoreH}
        kind="ghost"
        size={'medium'}
        on:click={(e) => {
          showMenu(e, { object })
        }}
      />
      <Button
        icon={IconMixin}
        kind={'icon'}
        iconProps={{ size: 'medium' }}
        selected={showAllMixins}
        on:click={() => {
          showAllMixins = !showAllMixins
        }}
      />
    </svelte:fragment>

    <svelte:fragment slot="custom-attributes">
      <DocAttributeBar
        {object}
        {mixins}
        readonly={!canEdit}
        ignoreKeys={['name', 'description', 'fullDescription', 'archived', 'type', 'private']}
      />
    </svelte:fragment>
  </Panel>
{/if}
