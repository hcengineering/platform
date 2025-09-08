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
  import card, { Card, CardSpace, MasterTag } from '@hcengineering/card'
  import presentation, { getClient, getCommunicationClient, SpaceSelector } from '@hcengineering/presentation'
  import { createEventDispatcher } from 'svelte'
  import core, { Data, generateId, Ref, Markup, notEmpty } from '@hcengineering/core'
  import { getResource, translate, getEmbeddedLabel } from '@hcengineering/platform'
  import { Label, Modal, ModernEditbox, languageStore, showPopup, Component } from '@hcengineering/ui'
  import { AttachmentStyledBox } from '@hcengineering/attachment-resources'
  import { EmptyMarkup } from '@hcengineering/text'
  import { Employee, getCurrentEmployee } from '@hcengineering/contact'
  import { SelectUsersPopup, employeeByIdStore } from '@hcengineering/contact-resources'
  import view from '@hcengineering/view'

  import { createCard } from '../utils'
  import CardCollaborators from './CardCollaborators.svelte'
  import { TypeSelector } from '../index'

  export let title: string = ''
  export let type: Ref<MasterTag> = 'chat:masterTag:Thread' as Ref<MasterTag>
  export let space: CardSpace | undefined = undefined
  export let changeType: boolean = false
  export let allowChangeSpace: boolean = true
  export let description: Markup = EmptyMarkup

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const communicationClient = getCommunicationClient()
  const me = getCurrentEmployee()
  const _id = generateId<Card>()

  $: extension =
    type != null
      ? client
        .getModel()
        .findAllSync(card.mixin.CreateCardExtension, {})
        .find((it) => hierarchy.isDerived(type, it._id))
      : undefined

  let data: Partial<Data<Card>> = { title }
  let _space: Ref<CardSpace> | undefined = space?._id
  let collaborators: Ref<Employee>[] = [me]

  let creating = false

  async function addCollaborators (): Promise<void> {
    if (type == null) return
    const accounts = collaborators
      .filter((it) => it !== me)
      .map((it) => $employeeByIdStore.get(it)?.personUuid)
      .filter(notEmpty)

    if (accounts.length > 0) {
      await communicationClient.addCollaborators(_id, type, accounts)
    }
  }

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
      await addCollaborators()

      dispatch('close', _id)
    } finally {
      creating = false
    }
  }

  function handleCancel (): void {
    dispatch('close')
  }

  let label: string = ''

  $: void updateLabel($languageStore)

  async function updateLabel (lang: string): Promise<void> {
    const _clazz = hierarchy.getClass(type)
    const typeString = await translate(_clazz.label, {}, lang)
    const createString = await translate(presentation.string.Create, {}, lang)
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
</script>

<Modal
  label={getEmbeddedLabel(label)}
  type="type-popup"
  width="large"
  okLabel={presentation.string.Create}
  {okAction}
  okLoading={creating}
  canSave={data.title != null && data.title.trim().length > 0 && _space != null}
  onCancel={handleCancel}
  on:close
>
  <div class="hulyModal-content__titleGroup" style="padding: 0">
    <ModernEditbox
      bind:value={data.title}
      label={view.string.Title}
      size="medium"
      kind="ghost"
      disabled={extension?.disableTitle ?? false}
      autoFocus={!(extension?.disableTitle ?? false)}
    />

    <AttachmentStyledBox
      objectId={_id}
      _class={type}
      space={_space ?? space?._id}
      alwaysEdit
      showButtons={false}
      bind:content={description}
      placeholder={core.string.Description}
      kind="indented"
      isScrollable={false}
      kitOptions={{ reference: true }}
      enableAttachments={false}
    />
  </div>

  <div class="hulyModal-content__settingsSet">
    {#if changeType}
      <div class="hulyModal-content__settingsSet-line">
        <span class="label"><Label label={card.string.MasterTag} /></span>
        <TypeSelector bind:value={type} />
      </div>
    {/if}
    {#if (space == null || allowChangeSpace) && !(extension?.hideSpace ?? false)}
      <div class="hulyModal-content__settingsSet-line">
        <span class="label"><Label label={core.string.Space} /></span>
        <SpaceSelector
          _class={card.class.CardSpace}
          query={{ archived: false }}
          label={core.string.Space}
          bind:space={_space}
          focus={false}
          kind={'regular'}
          size={'large'}
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
  </div>
</Modal>

<style lang="scss">
</style>
