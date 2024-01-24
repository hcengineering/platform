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
  import { Asset, Metadata, getEmbeddedLabel } from '@hcengineering/platform'
  import { Attribute, Class, Ref, Status, StatusCategory } from '@hcengineering/core'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { ProjectType, TaskType, calculateStatuses, createState } from '@hcengineering/task'
  import {
    ModernEditbox,
    getColorNumberByText,
    Modal,
    Label,
    ButtonMenu,
    IconSettings,
    TextArea,
    getPlatformColorDef,
    themeStore,
    EmojiPopup,
    ButtonIcon,
    IconDelete,
    IconCopy
  } from '@hcengineering/ui'
  import { statusStore, ColorsPopup } from '@hcengineering/view-resources'
  import view from '@hcengineering/view-resources/src/plugin'
  import { clearSettingsStore } from '@hcengineering/setting-resources'
  import task from '../plugin'
  import { taskTypeStore } from '..'
  import IconLink from './icons/Link.svelte'

  export let status: Status | undefined = undefined
  export let _class: Ref<Class<Status>> | undefined = status?._class
  export let taskType: TaskType
  export let type: ProjectType
  export let ofAttribute: Ref<Attribute<Status>>
  export let category: Ref<StatusCategory> | undefined = status?.category
  export let value = status?.name ?? ''
  export let color: number | undefined = undefined
  export let icons: Asset[]
  export let iconWithEmoji: Asset = view.ids.IconWithEmoji

  const client = getClient()

  let description: string | undefined = status?.description

  $: needUpdate =
    (status?.name.trim() !== value.trim() || description !== status?.description || color !== status?.color) &&
    value.trim() !== ''

  async function save (): Promise<void> {
    if (taskType === undefined || _class === undefined) return
    if (status === undefined) {
      const _id = await createState(client, _class, {
        ofAttribute,
        name: value.trim(),
        category,
        color,
        description
      })

      const states = taskType.statuses.map((p) => $statusStore.byId.get(p)).filter((p) => p !== undefined) as Status[]
      const lastIndex = states.findLastIndex((p) => p.category === category)
      const statuses = [...taskType.statuses.slice(0, lastIndex + 1), _id, ...taskType.statuses.slice(lastIndex + 1)]

      await client.update(type, {
        statuses: calculateStatuses(type, $taskTypeStore, [{ taskTypeId: taskType._id, statuses }])
      })
      await client.update(taskType, {
        statuses
      })
    } else if (needUpdate) {
      const _id = await createState(client, _class, {
        ofAttribute,
        name: value.trim(),
        category,
        color,
        description
      })
      const index = taskType.statuses.indexOf(status._id)
      const statuses = [...taskType.statuses.slice(0, index), _id, ...taskType.statuses.slice(index + 1)]
      await client.update(type, {
        statuses: calculateStatuses(type, $taskTypeStore, [{ taskTypeId: taskType._id, statuses }])
      })
      await client.update(taskType, {
        statuses
      })
      const projects = await client.findAll(task.class.Project, { type: type._id })
      while (true) {
        const docs = await client.findAll(
          task.class.Task,
          {
            status: status._id,
            space: { $in: projects.map((p) => p._id) }
          },
          { limit: 1000 }
        )
        if (docs.length === 0) {
          break
        }

        const op = client.apply(_id)
        docs.map((p) => op.update(p, { status: _id }))
        await op.commit()
      }
    }
    clearSettingsStore()
  }

  let selected: number = 0
  const items = [
    {
      id: 'color',
      label: task.string.Color
    },
    {
      id: 'emoji',
      label: view.string.EmojiCategory
    }
  ]
</script>

<Modal
  label={task.string.StatusPopupTitle}
  type={'type-aside'}
  okLabel={presentation.string.Save}
  okAction={save}
  canSave={needUpdate}
  onCancel={() => {
    clearSettingsStore()
  }}
>
  <svelte:fragment slot="actions">
    <ButtonIcon icon={IconDelete} size={'small'} kind={'tertiary'} />
    <ButtonIcon icon={IconCopy} size={'small'} kind={'tertiary'} />
  </svelte:fragment>
  <div class="hulyModal-content__titleGroup">
    <ModernEditbox bind:value label={task.string.StatusName} size={'large'} kind={'ghost'} />
    <TextArea
      placeholder={task.string.Description}
      width={'100%'}
      height={'4.5rem'}
      margin={'var(--spacing-1) var(--spacing-2)'}
      noFocusBorder
      bind:value={description}
    />
  </div>
  <div class="hulyModal-content__settingsSet">
    <div class="hulyModal-content__settingsSet-line">
      <span class="label"><Label label={task.string.Group} /></span>
      <!-- <ButtonMenu
        {items}
        {selected}
        icon={IconLink}
        label={getEmbeddedLabel('Compeletd')}
        kind={'secondary'}
        size={'medium'}
        on:selected={() => {}}
      /> -->
    </div>
    <div class="hulyModal-content__settingsSet-line">
      <span class="label"><Label label={task.string.Type} /></span>
      <!-- <ButtonMenu
        {items}
        {selected}
        icon={IconLink}
        label={getEmbeddedLabel('Success')}
        kind={'secondary'}
        size={'medium'}
        on:selected={() => {}}
      /> -->
    </div>
  </div>
  <div class="hulyModal-content__settingsSet table">
    <div class="hulyTableAttr-container">
      <div class="hulyTableAttr-header font-medium-12 withButton">
        <ButtonMenu
          {items}
          {selected}
          icon={IconSettings}
          label={items[selected].label}
          kind={'secondary'}
          size={'small'}
          on:selected={(event) => {
            if (event.detail) selected = items.findIndex((it) => it.id === event.detail)
          }}
        />
      </div>
      <div class="hulyTableAttr-content" class:mb-2={selected === 1}>
        {#if selected === 0}
          <ColorsPopup
            selected={getPlatformColorDef(color ?? 0, $themeStore.dark).name}
            embedded
            columns={'auto'}
            on:close={(evt) => {
              color = evt.detail
            }}
          />
        {:else}
          <EmojiPopup
            embedded
            on:close={(evt) => {
              color = evt.detail.codePointAt(0)
            }}
          />
        {/if}
      </div>
    </div>
  </div>
</Modal>
