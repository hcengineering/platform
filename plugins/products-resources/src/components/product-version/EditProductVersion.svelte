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
  import core, { Class, Doc, Ref, WithLookup, getCurrentAccount } from '@hcengineering/core'
  import { includesAny } from '@hcengineering/contact'
  import { checkMyPermission, permissionsStore } from '@hcengineering/contact-resources'
  import notification from '@hcengineering/notification'
  import { Panel } from '@hcengineering/panel'
  import { getResource } from '@hcengineering/platform'
  import { ActionContext, MessageViewer, createQuery, getClient } from '@hcengineering/presentation'
  import { Button, IconMixin, IconMoreH } from '@hcengineering/ui'
  import { DocAttributeBar, getDocMixins, showMenu } from '@hcengineering/view-resources'
  import type { ProductVersion } from '@hcengineering/products'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'

  import products from '../../plugin'
  import ProductPresenter from '../product/ProductPresenter.svelte'
  import ProductVersionStatePresenter from './ProductVersionStatePresenter.svelte'

  export let _id: Ref<ProductVersion>
  export let _class: Ref<Class<ProductVersion>>
  export let readonly: boolean = false

  const client = getClient()
  const dispatch = createEventDispatcher()
  const notificationClient = getResource(notification.function.GetInboxNotificationsClient).then((res) => res())

  let object: WithLookup<ProductVersion> | undefined

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
    query.query(
      _class,
      { _id },
      async (result) => {
        ;[object] = result
      },
      {
        lookup: {
          space: products.class.Product
        }
      }
    )

  let showAllMixins = false
  $: mixins = object !== undefined ? getDocMixins(object, showAllMixins) : []

  onMount(() => {
    dispatch('open', { ignoreKeys: ['description'] })
  })

  $: canEdit =
    !readonly &&
    object?.$lookup?.space !== undefined &&
    (includesAny(object?.$lookup?.space.owners ?? [], getCurrentAccount().socialIds) ||
      checkMyPermission(core.permission.UpdateSpace, object.space, $permissionsStore) ||
      checkMyPermission(core.permission.UpdateObject, core.space.Space, $permissionsStore))

  $: descriptionKey = client.getHierarchy().getAttribute(products.class.ProductVersion, 'description')
</script>

{#if object !== undefined}
  <ActionContext context={{ mode: 'editor' }} />

  <Panel
    {object}
    isHeader={false}
    isAside={true}
    isSub={false}
    on:close={() => dispatch('close')}
    useMaxWidth
    adaptive={'default'}
  >
    <svelte:fragment slot="title">
      <div class="flex-row-center no-word-wrap">
        <div class="flex-row-center flex-gap-1-5">
          {#if object.$lookup?.space}
            <ProductPresenter value={object.$lookup?.space} noUnderline accent />
            <span>•</span>
          {/if}
          {object.name}
          <span>•</span>
          <ProductVersionStatePresenter value={object.state} />
        </div>
      </div>
    </svelte:fragment>

    <div class="heading-medium-20">
      {object.name}
    </div>

    <div class="w-full mt-6">
      {#if canEdit}
        <AttachmentStyleBoxEditor
          focusIndex={30}
          {object}
          key={{ key: 'description', attr: descriptionKey }}
          placeholder={core.string.Description}
        />
      {:else}
        <MessageViewer message={object.description ?? ''} />
      {/if}
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
      <DocAttributeBar {object} {mixins} readonly={!canEdit} ignoreKeys={['name', 'description']} />
    </svelte:fragment>
  </Panel>
{/if}
