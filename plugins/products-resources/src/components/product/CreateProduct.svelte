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
  import { deepEqual } from 'fast-equals'
  import { createEventDispatcher } from 'svelte'

  import { type DocumentSpaceType } from '@hcengineering/controlled-documents'
  import { type Product, ProductVersionState } from '@hcengineering/products'
  import { type Attachment } from '@hcengineering/attachment'
  import { AttachmentPresenter, AttachmentStyledBox } from '@hcengineering/attachment-resources'
  import { AccountArrayEditor, personRefByAccountUuidStore } from '@hcengineering/contact-resources'
  import core, {
    AccountUuid,
    Data,
    Ref,
    Role,
    RolesAssignment,
    SortingOrder,
    SpaceType,
    WithLookup,
    generateId,
    getCurrentAccount,
    notEmpty
  } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { Card, MessageBox, createQuery, getClient } from '@hcengineering/presentation'
  import {
    Button,
    DropdownLabelsIntl,
    EditBox,
    FocusHandler,
    IconAttachment,
    IconWithEmoji,
    createFocusManager,
    getPlatformColorDef,
    showPopup,
    themeStore
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { IconPicker, SpaceTypeSelector } from '@hcengineering/view-resources'

  import products from '../../plugin'

  const dispatch = createEventDispatcher()
  const client = getClient()
  const manager = createFocusManager()

  const productId: Ref<Product> = generateId()
  const currentAccount = getCurrentAccount()

  let descriptionBox: AttachmentStyledBox

  let object: Data<Product> = createDefaultObject()
  let attachments: Map<Ref<Attachment>, Attachment> = new Map<Ref<Attachment>, Attachment>()
  let rolesAssignment: RolesAssignment = {}

  let typeId: Ref<DocumentSpaceType> = products.spaceType.ProductType
  let spaceType: WithLookup<SpaceType> | undefined

  $: membersPersons = object.members.map((m) => $personRefByAccountUuidStore.get(m)).filter(notEmpty)

  let roles: Role[] = []
  const rolesQuery = createQuery()
  $: if (typeId !== undefined) {
    rolesQuery.query(
      core.class.Role,
      { attachedTo: typeId },
      (res) => {
        roles = res

        if (rolesAssignment === undefined && typeId !== undefined) {
          rolesAssignment = roles.reduce<RolesAssignment>((prev, { _id }) => {
            prev[_id] = []

            return prev
          }, {})
        }
      },
      {
        sort: {
          name: SortingOrder.Ascending
        }
      }
    )
  } else {
    rolesQuery.unsubscribe()
  }

  $: void loadSpaceType(typeId)
  async function loadSpaceType (id: typeof typeId): Promise<void> {
    spaceType =
      id !== undefined
        ? await client
          .getModel()
          .findOne(core.class.SpaceType, { _id: id }, { lookup: { _id: { roles: core.class.Role } } })
        : undefined
  }

  function chooseIcon (): void {
    const { icon, color } = object
    const icons = [products.icon.Product]
    showPopup(IconPicker, { icon, color, icons }, 'top', (result) => {
      if (result !== undefined && result !== null) {
        object.icon = result.icon
        object.color = result.color
      }
    })
  }

  function handleOwnersChanged (newOwners: AccountUuid[]): void {
    object.owners = newOwners

    const newMembersSet = new Set([...object.owners, ...object.members])
    object.members = Array.from(newMembersSet)
  }

  function handleMembersChanged (newMembers: AccountUuid[]): void {
    // If a member was removed we need to remove it from any roles assignments as well
    const newMembersSet = new Set(newMembers)
    const removedMembersSet = new Set(object.members.filter((m) => !newMembersSet.has(m)))

    if (removedMembersSet.size > 0 && rolesAssignment !== undefined) {
      for (const [key, value] of Object.entries(rolesAssignment)) {
        rolesAssignment[key as Ref<Role>] = value != null ? value.filter((m) => !removedMembersSet.has(m)) : undefined
      }
    }

    object.members = newMembers
  }

  function handleRoleAssignmentChanged (roleId: Ref<Role>, newMembers: AccountUuid[]): void {
    if (rolesAssignment === undefined) {
      rolesAssignment = {}
    }

    rolesAssignment[roleId] = newMembers
  }

  async function handleOkAction (): Promise<void> {
    if (typeId === undefined || spaceType?.targetClass === undefined) {
      return
    }

    const ops = client.apply()

    await ops.createDoc(
      products.class.Product,
      core.space.Space,
      {
        ...object,
        type: typeId,
        name: object.name.trim()
      },
      productId
    )

    await ops.createDoc(products.class.ProductVersion, productId, {
      readonly: false,
      major: 1,
      minor: 0,
      name: '1.0',
      codename: '',
      description: '',
      parent: products.ids.NoParentVersion,
      state: ProductVersionState.Active
    })

    // Create space type's mixin with roles assignments
    await ops.createMixin(productId, products.class.Product, core.space.Space, spaceType.targetClass, rolesAssignment)
    await descriptionBox.createAttachments(undefined, ops)
    await ops.commit()
    object = createDefaultObject()
    dispatch('close', productId)
  }

  async function handleClose (): Promise<void> {
    const noChanges = deepEqual(object, createDefaultObject())
    if (noChanges) {
      dispatch('close')
    } else {
      showPopup(
        MessageBox,
        {
          label: products.string.CreateDialogClose,
          message: products.string.CreateDialogCloseNote
        },
        'top',
        (result?: boolean) => {
          if (result === true) {
            dispatch('close')
            descriptionBox?.removeDraft(true)
          }
        }
      )
    }
  }

  function createDefaultObject (): Data<Product> {
    return {
      // Space
      name: '',
      description: '',
      private: true,
      members: [currentAccount.uuid],
      archived: false,
      // ExternalSpace
      type: products.spaceType.ProductType,
      // Product
      fullDescription: '',
      owners: [currentAccount.uuid]
    }
  }

  $: canSave =
    object.name.trim().length > 0 &&
    (!object.private || object.members.length > 0) &&
    object.owners !== undefined &&
    object.owners.length > 0 &&
    (!object.private || object.owners.some((p) => object.members.includes(p)))
</script>

<FocusHandler {manager} />

<Card
  label={products.string.CreateProduct}
  okAction={handleOkAction}
  {canSave}
  on:close={handleClose}
  hideAttachments={attachments.size === 0}
>
  <svelte:fragment slot="header">
    <SpaceTypeSelector
      bind:type={typeId}
      descriptors={[products.spaceTypeDescriptor.ProductType]}
      focusIndex={4}
      kind="regular"
      size="large"
    />
  </svelte:fragment>

  <div class="flex-row-center flex-gap-3 clear-mins">
    <Button
      size={'medium'}
      kind={'link-bordered'}
      noFocus
      icon={object.icon === view.ids.IconWithEmoji ? IconWithEmoji : object.icon ?? products.icon.Product}
      iconProps={object.icon === view.ids.IconWithEmoji
        ? { icon: object.color }
        : {
            fill: object.color !== undefined ? getPlatformColorDef(object.color, $themeStore.dark).icon : 'currentColor'
          }}
      on:click={chooseIcon}
    />
    <EditBox
      placeholder={products.string.ProductNamePlaceholder}
      bind:value={object.name}
      kind="large-style"
      autoFocus
      focusIndex={1}
    />
  </div>

  {#key productId}
    <AttachmentStyledBox
      bind:this={descriptionBox}
      objectId={productId}
      _class={products.class.Product}
      space={core.space.Space}
      focusIndex={2}
      alwaysEdit
      showButtons={false}
      kind={'indented'}
      maxHeight="limited"
      enableBackReferences={true}
      enableAttachments={false}
      bind:content={object.fullDescription}
      placeholder={core.string.Description}
      on:changeSize={() => dispatch('changeContent')}
      on:attach={(ev) => {
        if (ev.detail.action === 'saved') {
          object.attachments = ev.detail.value
        }
      }}
      on:attachments={(ev) => {
        if (ev.detail.size > 0) attachments = ev.detail.values
        else if (ev.detail.size === 0 && ev.detail.values != null) {
          attachments.clear()
          attachments = attachments
        }
      }}
    />
  {/key}

  <svelte:fragment slot="pool">
    <DropdownLabelsIntl
      label={core.string.Private}
      kind={'regular'}
      size={'large'}
      items={[
        { id: products.string.Public, label: products.string.Public },
        { id: products.string.Private, label: products.string.Private }
      ]}
      disabled={true}
      selected={object.private ? products.string.Private : products.string.Public}
      on:selected={(e) => {
        object.private = e.detail === products.string.Private
      }}
    />

    <AccountArrayEditor
      value={object.owners ?? []}
      label={core.string.Owners}
      emptyLabel={core.string.Owners}
      onChange={handleOwnersChanged}
      kind={'regular'}
      size={'large'}
    />

    <AccountArrayEditor
      value={object.members}
      label={products.string.Members}
      emptyLabel={products.string.Members}
      onChange={handleMembersChanged}
      kind={'regular'}
      size={'large'}
      allowGuests
    />

    {#each roles as role}
      <AccountArrayEditor
        value={rolesAssignment?.[role._id] ?? []}
        label={getEmbeddedLabel(role.name)}
        includeItems={membersPersons}
        readonly={membersPersons.length === 0}
        emptyLabel={getEmbeddedLabel(role.name)}
        onChange={(refs) => {
          handleRoleAssignmentChanged(role._id, refs)
        }}
        kind={'regular'}
        size={'large'}
      />
    {/each}
  </svelte:fragment>

  <svelte:fragment slot="attachments">
    {#if attachments.size > 0}
      {#each Array.from(attachments.values()) as attachment}
        <AttachmentPresenter
          value={attachment}
          showPreview
          removable
          on:remove={(result) => {
            if (result.detail !== undefined) {
              descriptionBox.removeAttachmentById(result.detail._id)
            }
          }}
        />
      {/each}
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="footer">
    <Button
      focusIndex={20}
      icon={IconAttachment}
      iconProps={{ fill: 'var(--theme-dark-color)' }}
      size={'large'}
      kind={'ghost'}
      on:click={() => {
        descriptionBox.handleAttach()
      }}
    />
  </svelte:fragment>
</Card>
