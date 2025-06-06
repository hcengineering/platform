<!--
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
-->
<script lang="ts">
  import contact from '@hcengineering/contact'
  import { AccountArrayEditor } from '@hcengineering/contact-resources'
  import core, { AccountUuid, reduceCalls, type SpaceType, type SpaceTypeDescriptor } from '@hcengineering/core'
  import { createQuery, getClient, MessageBox } from '@hcengineering/presentation'
  import {
    ButtonIcon,
    IconDelete,
    IconSquareExpand,
    Label,
    ModernButton,
    ModernEditbox,
    showPopup,
    TextArea,
    Toggle
  } from '@hcengineering/ui'
  import { deleteObjects } from '@hcengineering/view-resources'

  import settingRes from '../../../plugin'

  export let type: SpaceType | undefined
  export let descriptor: SpaceTypeDescriptor | undefined
  export let disabled: boolean = true

  const client = getClient()
  let shortDescription = type?.shortDescription ?? ''

  let loading: boolean = true
  let spacesCount: number = 0
  const spacesCountQuery = createQuery()
  $: if (type !== undefined) {
    spacesCountQuery.query(
      core.class.TypedSpace,
      { type: type._id },
      (res) => {
        spacesCount = res.total
        loading = false
      },
      {
        total: true,
        limit: 1,
        projection: { _id: 1 }
      }
    )
  } else {
    spacesCountQuery.unsubscribe()
  }

  $: canDelete = !loading && spacesCount === 0

  async function attributeUpdated<T extends keyof SpaceType> (field: T, value: SpaceType[T]): Promise<void> {
    if (disabled || type === undefined || type[field] === value) {
      return
    }

    await client.update(type, { [field]: value })
  }

  const changeMembers = reduceCalls(async function changeMembers (members: AccountUuid[]): Promise<void> {
    if (disabled || type === undefined) {
      return
    }

    const push = new Set<AccountUuid>(members)
    const pull = new Set<AccountUuid>()
    for (const member of (type.members ?? []).filter((it, idx, arr) => arr.indexOf(it) === idx)) {
      if (!push.has(member)) {
        pull.add(member)
      } else {
        push.delete(member)
      }
    }
    if (push.size === 0 && pull.size === 0) {
      return
    }
    const ops = client.apply(undefined, 'change-members')
    for (const pushMem of push) {
      ops.update(type, { $push: { members: pushMem } })
    }
    for (const pullMem of pull) {
      ops.update(type, { $pull: { members: pullMem } })
    }
    await ops.commit()
  })

  async function handleDelete (): Promise<void> {
    if (!canDelete || disabled || type == null) {
      return
    }

    showPopup(MessageBox, {
      label: settingRes.string.DeleteSpaceType,
      message: settingRes.string.DeleteSpaceTypeConfirm,
      action: async () => {
        if (type == null) {
          return
        }

        await deleteObjects(client, [type])
      }
    })
  }
</script>

{#if descriptor !== undefined}
  {@const dIcon = descriptor.icon === '' ? settingRes.icon.Setting : descriptor.icon}
  <div class="hulyComponent-content__column-group">
    <div class="hulyComponent-content__header">
      <div class="flex gap-1">
        <ButtonIcon icon={dIcon} size={'large'} kind={'secondary'} dataId={'btnSelectIcon'} />
        <ModernEditbox
          kind="ghost"
          size="large"
          label={settingRes.string.SpaceTypeTitle}
          value={type?.name ?? ''}
          {disabled}
          on:blur={(evt) => {
            attributeUpdated('name', evt.detail)
          }}
        />
      </div>
      <div class="flex-row">
        <ModernButton
          icon={IconSquareExpand}
          label={settingRes.string.CountSpaces}
          labelParams={{ count: spacesCount }}
          disabled={spacesCount === 0}
          kind="tertiary"
          size="medium"
          hasMenu
        />
        {#if canDelete}
          <ButtonIcon icon={IconDelete} size="small" kind="secondary" {disabled} on:click={handleDelete} />
        {/if}
      </div>
    </div>
    <TextArea
      placeholder={settingRes.string.Description}
      width="100%"
      height="4.5rem"
      margin="var(--spacing-2) 0"
      noFocusBorder
      {disabled}
      bind:value={shortDescription}
      on:change={() => {
        attributeUpdated('shortDescription', shortDescription)
      }}
    />
    <div class="flex-between">
      <AccountArrayEditor
        value={type?.members ?? []}
        label={contact.string.Members}
        onChange={changeMembers}
        readonly={disabled}
      />
      <div class="flex-row-center flex-gap-2">
        <Label label={core.string.AutoJoin} />
        <Toggle
          on={type?.autoJoin ?? false}
          on:change={(evt) => {
            attributeUpdated('autoJoin', evt.detail)
          }}
          {disabled}
        />
      </div>
    </div>
    <slot name="extra" />
  </div>
{/if}
