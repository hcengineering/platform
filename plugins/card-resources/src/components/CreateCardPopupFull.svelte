<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- Copyright © 2026 TraceX SAS. -->
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
  import { Card, CardSpace, type CreateCardExtension, MasterTag } from '@hcengineering/card'
  import presentation, { createQuery, getClient, SpaceSelector } from '@hcengineering/presentation'
  import { createEventDispatcher } from 'svelte'
  import core, { Data, generateId, Ref, Markup, getCurrentAccount } from '@hcengineering/core'
  import { getResource, translate, getEmbeddedLabel } from '@hcengineering/platform'
  import { Notice, Label, Modal, ModernEditbox, languageStore, showPopup, Component } from '@hcengineering/ui'
  import { AttachmentStyledBox } from '@hcengineering/attachment-resources'
  import { EmptyMarkup } from '@hcengineering/text'
  import { Employee, getCurrentEmployee, getGuestScopedEmployees } from '@hcengineering/contact'
  import { SelectUsersPopup, permissionsStore } from '@hcengineering/contact-resources'
  import view from '@hcengineering/view'

  import { createCard, getRootType, isBaseTypeWithSubtypes } from '../utils'
  import CardCollaborators from './CardCollaborators.svelte'
  import { TypeSelector } from '../index'
  import { canCreateObject } from '@hcengineering/view-resources'
  import card from '../plugin'
  import CreateCardFields from './CreateCardFields.svelte'

  export let title: string = ''
  export let type: Ref<MasterTag> | null = card.types.Document
  export let space: Ref<CardSpace> | undefined = undefined
  export let changeType: boolean = false
  export let allowChangeSpace: boolean = true
  export let description: Markup = EmptyMarkup

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const me = getCurrentEmployee()
  const _id = generateId<Card>()

  function getCreateCardExtension (_type: Ref<MasterTag> | null): CreateCardExtension | undefined {
    if (_type == null) return undefined

    return client
      .getModel()
      .findAllSync(card.mixin.CreateCardExtension, {})
      .find((it) => hierarchy.isDerived(_type, it._id))
  }

  $: extension = getCreateCardExtension(type)

  let data: Partial<Data<Card>> = { title }
  let _space: Ref<CardSpace> | undefined = space
  let selectedSpace: CardSpace | undefined
  let collaborators: Ref<Employee>[] = [me]

  // Guests pick collaborators among the people of the selected space.
  // Undefined means no narrowing: not a guest or no space selected.
  let scopedEmployees: Ref<Employee>[] | undefined = undefined

  $: void updateScopedEmployees(_space)

  async function updateScopedEmployees (space: Ref<CardSpace> | undefined): Promise<void> {
    const employees = await getGuestScopedEmployees(client, space !== undefined ? { space } : undefined)
    if (space !== _space) return
    scopedEmployees = employees?.map((it) => it._id)
    if (scopedEmployees !== undefined) {
      const allowed = new Set(scopedEmployees)
      collaborators = collaborators.filter((it) => it === me || allowed.has(it))
    }
  }

  const spaceQuery = createQuery()
  $: if (_space != null) {
    if (selectedSpace?._id !== _space) {
      selectedSpace = undefined
    }
    spaceQuery.query(card.class.CardSpace, { _id: _space }, (result) => {
      selectedSpace = result[0]
    })
  } else {
    spaceQuery.unsubscribe()
    selectedSpace = undefined
  }

  let fieldsValid = false
  let creating = false

  async function okAction (): Promise<void> {
    if (_space === undefined || type == null || !fieldsValid) return

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

  async function updateLabel (lang: string, _type: Ref<MasterTag> | null): Promise<void> {
    const createString = await translate(presentation.string.Create, {}, lang)
    if (_type == null) {
      label = createString
      return
    }

    const _clazz = hierarchy.getClass(_type)
    const typeString = await translate(_clazz.label, {}, lang)
    label = `${createString} ${typeString}`
  }

  function openSelectUsersPopup (): void {
    showPopup(
      SelectUsersPopup,
      {
        okLabel: presentation.string.Ok,
        disableDeselectFor: [me],
        skipCurrentAccount: false,
        skipInactive: true,
        selected: collaborators,
        includeItems: scopedEmployees,
        showStatus: true
      },
      'top',
      (result?: Ref<Employee>[]) => {
        if (result != null) {
          collaborators = result
        }
      }
    )
  }

  function handleChange (event: CustomEvent<{ data: Partial<Data<Card>>, space?: Ref<CardSpace> }>): void {
    data = {
      ...data,
      ...event.detail.data
    }

    if (event.detail.space != null) {
      _space = event.detail.space
    }
  }

  $: typeAllowedBySpace =
    type != null && selectedSpace != null && selectedSpace.types.includes(getRootType(hierarchy, type))
  $: missingSelection = _space == null || type == null
  $: allowed =
    _space != null &&
    type != null &&
    typeAllowedBySpace &&
    canCreateObject(type, _space, $permissionsStore) &&
    !isBaseTypeWithSubtypes(hierarchy, type)
</script>

<Modal
  label={getEmbeddedLabel(label)}
  type="type-popup"
  width="large"
  okLabel={presentation.string.Create}
  {okAction}
  okLoading={creating}
  canSave={data.title != null && data.title.trim().length > 0 && _space != null && allowed && fieldsValid}
  onCancel={handleCancel}
  maxWidth="90vw"
  on:close
>
  <div class="hulyModal-content__titleGroup" style="padding: 0">
    <ModernEditbox
      bind:value={data.title}
      label={view.string.Title}
      size="large"
      kind="ghost"
      style="font-size: 1.125rem;"
      disabled={extension?.disableTitle ?? false}
      autoFocus={!(extension?.disableTitle ?? false)}
    />

    {#if type != null}
      <AttachmentStyledBox
        objectId={_id}
        _class={type}
        space={_space}
        alwaysEdit
        showButtons={false}
        bind:content={description}
        placeholder={core.string.Description}
        kind="indented"
        isScrollable={true}
        kitOptions={{ reference: true }}
        enableAttachments={false}
      />
    {/if}
  </div>

  <div class="hulyModal-content__settingsSet">
    {#if changeType}
      <div class="hulyModal-content__settingsSet-line">
        <span class="label"><Label label={card.string.MasterTag} /></span>
        <TypeSelector bind:value={type} allowedRootTypes={selectedSpace?.types} excludeBaseTypes size={'medium'} />
      </div>
    {/if}
    {#if (space == null || allowChangeSpace) && !(extension?.hideSpace ?? false)}
      <div class="hulyModal-content__settingsSet-line">
        <span class="label"><Label label={core.string.Space} /></span>
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
          size={'medium'}
        />
      </div>
    {/if}

    <CardCollaborators
      ids={collaborators}
      disableRemoveFor={[me]}
      on:add={openSelectUsersPopup}
      on:remove={(ev) => {
        collaborators = collaborators.filter((id) => id !== ev.detail)
      }}
    />

    {#if extension?.component}
      <Component is={extension.component} props={{ collaborators, data, space: _space }} on:change={handleChange} />
    {/if}
    {#if type != null}
      <CreateCardFields {type} bind:data bind:valid={fieldsValid} />
    {/if}
  </div>

  <div slot="afterContent" class="p-4 flex-row-reverse">
    {#if !allowed}
      {#if missingSelection}
        <Notice kind="warning" label={card.string.SelectTypeAndSpace} />
      {:else}
        <Notice kind="error" label={view.string.NoCreatePermissionTitle} />
      {/if}
    {/if}
  </div>
</Modal>
