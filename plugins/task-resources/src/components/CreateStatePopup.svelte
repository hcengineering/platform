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
  import core, { Attribute, Class, Ref, Status, StatusCategory } from '@hcengineering/core'
  import { Asset, getEmbeddedLabel } from '@hcengineering/platform'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { clearSettingsStore } from '@hcengineering/setting-resources'
  import { ProjectType, TaskType, calculateStatuses, createState } from '@hcengineering/task'
  import {
    ButtonIcon,
    ButtonMenu,
    EmojiPopup,
    IconCopy,
    IconDelete,
    IconSettings,
    IconWithEmoji,
    Label,
    Modal,
    ModernEditbox,
    TextArea,
    getPlatformColorDef,
    themeStore
  } from '@hcengineering/ui'
  import { ColorsPopup, statusStore } from '@hcengineering/view-resources'
  import view from '@hcengineering/view-resources/src/plugin'
  import { taskTypeStore } from '..'
  import task from '../plugin'

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
  export let icon: Asset | undefined

  const client = getClient()

  let description: string | undefined = status?.description

  $: allowEditCategory = status === undefined

  $: needUpdate =
    (status === undefined ||
      status.name.trim() !== value.trim() ||
      description !== status?.description ||
      color !== status.color) &&
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

      type.statuses.push({
        _id,
        color,
        icon,
        taskType: taskType._id
      })

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
      for (const status of type.statuses) {
        if (status._id === _id) {
          status.color = color
          status.icon = icon as any // Fix me
        }
      }
      await client.update(type, {
        statuses: calculateStatuses(type, $taskTypeStore, [{ taskTypeId: taskType._id, statuses }])
      })
      await client.update(taskType, {
        statuses
      })
      if (status._id !== _id) {
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
    }
  }

  let selected: number = icon === iconWithEmoji ? 1 : 0
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

  $: allCategories = getClient()
    .getModel()
    .findAllSync(core.class.StatusCategory, { _id: { $in: taskType.statusCategories } })

  $: categories = allCategories.map((it) => ({
    id: it._id,
    label: it.label,
    icon: it.icon
  }))
</script>

<Modal
  label={task.string.StatusPopupTitle}
  type={'type-aside'}
  okLabel={status === undefined ? presentation.string.Create : presentation.string.Save}
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
      <span class="label"><Label label={getEmbeddedLabel('Status Category')} /></span>
      <ButtonMenu
        items={categories}
        selected={category}
        disabled={!allowEditCategory}
        icon={categories.find((it) => it.id === category)?.icon}
        label={categories.find((it) => it.id === category)?.label}
        kind={'secondary'}
        size={'medium'}
        on:selected={(it) => {
          category = it.detail
        }}
      />
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
            if (event.detail) {
              selected = items.findIndex((it) => it.id === event.detail)
              if (selected === 1) {
                icon = undefined
              }
            }
          }}
        />
        {#if icon === iconWithEmoji}
          <IconWithEmoji icon={color ?? 0} size={'medium'} />
        {/if}
      </div>
      <div class="hulyTableAttr-content" class:mb-2={selected === 1}>
        {#if selected === 0}
          <ColorsPopup
            selected={getPlatformColorDef(color ?? 0, $themeStore.dark).name}
            embedded
            columns={'auto'}
            on:close={(evt) => {
              color = evt.detail
              icon = undefined
            }}
          />
        {:else}
          <EmojiPopup
            embedded
            selected={String.fromCodePoint(color ?? 0)}
            on:close={(evt) => {
              color = evt.detail.codePointAt(0)
              icon = iconWithEmoji
            }}
          />
        {/if}
      </div>
    </div>
  </div>
</Modal>
