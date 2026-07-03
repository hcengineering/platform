<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->

<script lang="ts">
  import card, { Card as TypeCard, CardSpace, MasterTag } from '@hcengineering/card'
  import presentation, { Card, getClient, SpaceSelector } from '@hcengineering/presentation'
  import { createEventDispatcher } from 'svelte'
  import core, { Data, generateId, Ref, Markup, getCurrentAccount } from '@hcengineering/core'
  import { getResource, translate, getEmbeddedLabel } from '@hcengineering/platform'
  import { Label, Modal, ModernEditbox, languageStore } from '@hcengineering/ui'
  import { EmptyMarkup } from '@hcengineering/text'
  import { permissionsStore } from '@hcengineering/contact-resources'
  import view from '@hcengineering/view'

  import { createCard, isBaseTypeWithSubtypes } from '../utils'
  import { TypeSelector } from '../index'
  import { canCreateObject } from '@hcengineering/view-resources'

  export let title: string = ''
  export let type: Ref<MasterTag> = card.types.Document
  export let space: Ref<CardSpace> | undefined = undefined
  export let description: Markup = EmptyMarkup

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const _id = generateId<TypeCard>()

  $: extension =
    type != null
      ? client
        .getModel()
        .findAllSync(card.mixin.CreateCardExtension, {})
        .find((it) => hierarchy.isDerived(type, it._id))
      : undefined

  const data: Partial<Data<TypeCard>> = { title }
  let _space: Ref<CardSpace> | undefined = space

  let creating = false

  async function okAction (): Promise<void> {
    if (_space === undefined || type == null) return

    try {
      creating = true

      if (extension?.canCreate != null) {
        const fn = await getResource(extension.canCreate)
        const res = await fn(_space, data)
        if (res === false) {
          dispatch('close')
          return
        } else if (typeof res === 'string') {
          dispatch('close', res)
          return
        }
      }

      await createCard(type, _space, data, description, _id)

      dispatch('close', _id)
    } finally {
      creating = false
    }
  }

  function handleCancel (): void {
    dispatch('close')
  }

  let label: string = ''

  $: void updateLabel($languageStore, type)

  async function updateLabel (lang: string, _type: Ref<MasterTag>): Promise<void> {
    const _clazz = hierarchy.getClass(_type)
    const typeString = await translate(_clazz.label, {}, lang)
    const createString = await translate(presentation.string.Create, {}, lang)
    label = `${createString} ${typeString}`
  }

  $: allowed =
    _space != null && canCreateObject(type, _space, $permissionsStore) && !isBaseTypeWithSubtypes(hierarchy, type)
</script>

<Card
  label={getEmbeddedLabel(label)}
  {okAction}
  canSave={data.title != null && data.title.trim().length > 0 && _space != null && allowed}
  okLabel={presentation.string.Create}
  on:close={() => dispatch('close')}
  onCancel={handleCancel}
  headerNoPadding
  noFade={true}
  on:changeContent
>
  <svelte:fragment slot="header">
    <SpaceSelector
      _class={card.class.CardSpace}
      query={{
        archived: false,
        members: getCurrentAccount().uuid
      }}
      label={core.string.Space}
      bind:space={_space}
      focus={false}
      clearInvalidValue={true}
      kind={'regular'}
      size={'large'}
    />
    <TypeSelector bind:value={type} excludeBaseTypes />
  </svelte:fragment>
  <ModernEditbox bind:value={data.title} label={view.string.Title} size="medium" kind="ghost" autoFocus />
  <svelte:fragment slot="pool">
    <div slot="afterContent" class="error p-4 flex-row-reverse">
      {#if !allowed}
        <Label label={view.string.NoCreatePermissionTitle} />
      {/if}
    </div>
  </svelte:fragment>
</Card>

<style lang="scss">
  .error {
    color: var(--theme-error-color);
  }
</style>
