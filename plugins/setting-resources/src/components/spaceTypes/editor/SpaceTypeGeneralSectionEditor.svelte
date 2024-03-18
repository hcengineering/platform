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
  import core, { type SpaceType, type SpaceTypeDescriptor } from '@hcengineering/core'
  import { ButtonIcon, IconSquareExpand, ModernButton, ModernEditbox, TextArea } from '@hcengineering/ui'
  import { createQuery, getClient } from '@hcengineering/presentation'

  import settingRes from '../../../plugin'

  export let type: SpaceType | undefined
  export let descriptor: SpaceTypeDescriptor | undefined

  const client = getClient()
  let shortDescription = type?.shortDescription ?? ''

  let spacesCount: number = 0
  const spacesCountQuery = createQuery()
  $: if (type !== undefined) {
    spacesCountQuery.query(
      core.class.TypedSpace,
      { type: type._id },
      (res) => {
        spacesCount = res.length
      },
      {
        projection: { _id: 1 }
      }
    )
  } else {
    spacesCountQuery.unsubscribe()
  }

  async function attributeUpdated<T extends keyof SpaceType> (field: T, value: SpaceType[T]): Promise<void> {
    if (type === undefined || type[field] === value) {
      return
    }

    await client.update(type, { [field]: value })
  }
</script>

{#if descriptor !== undefined}
  <div class="hulyComponent-content__column-group">
    <div class="hulyComponent-content__header">
      <div class="flex gap-1">
        <ButtonIcon icon={descriptor.icon} size={'large'} kind={'secondary'} />
        <ModernEditbox
          kind="ghost"
          size="large"
          label={settingRes.string.SpaceTypeTitle}
          value={type?.name ?? ''}
          on:blur={(evt) => {
            attributeUpdated('name', evt.detail)
          }}
        />
      </div>
      <ModernButton
        icon={IconSquareExpand}
        label={settingRes.string.CountSpaces}
        labelParams={{ count: spacesCount }}
        disabled={spacesCount === 0}
        kind="tertiary"
        size="medium"
        hasMenu
      />
    </div>
    <TextArea
      placeholder={settingRes.string.Description}
      width="100%"
      height="4.5rem"
      margin="var(--spacing-2) 0"
      noFocusBorder
      bind:value={shortDescription}
      on:change={() => {
        attributeUpdated('shortDescription', shortDescription)
      }}
    />
    <slot name="extra" />
  </div>
{/if}
