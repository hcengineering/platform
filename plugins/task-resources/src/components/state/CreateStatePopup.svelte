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
  import presentation, { createQuery, getClient } from '@hcengineering/presentation'
  import { clearSettingsStore, settingsStore } from '@hcengineering/setting-resources'
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
    closePopup,
    fromCodePoint,
    getPlatformColorDef,
    showPopup,
    themeStore
  } from '@hcengineering/ui'
  import { ColorsPopup, statusStore } from '@hcengineering/view-resources'
  import view from '@hcengineering/view-resources/src/plugin'
  import { taskTypeStore, typeStore } from '../..'
  import task from '../../plugin'
  import ApproveStatusRenamePopup from './ApproveStatusRenamePopup.svelte'
  import DeleteStateConfirmationPopup from './DeleteStateConfirmationPopup.svelte'

  export let status: Status | undefined = undefined
  export let _class: Ref<Class<Status>> | undefined = status?._class
  export let taskType: TaskType
  export let type: ProjectType
  export let ofAttribute: Ref<Attribute<Status>>
  export let category: Ref<StatusCategory> | undefined = status?.category
  export let value: string
  export let valuePattern: string | undefined = ''
  export let color: number | undefined = undefined
  export let icons: Asset[]
  export let iconWithEmoji: Asset = view.ids.IconWithEmoji
  export let icon: Asset | undefined
  export let canDelete: boolean = true
  export let selectableStates: Status[] = []
  export let readonly: boolean = true

  $: _taskType = $taskTypeStore.get(taskType._id) as TaskType
  $: _type = $typeStore.get(type._id) as ProjectType

  value = status?.name ?? valuePattern ?? ''

  const client = getClient()

  let description: string | undefined = status?.description

  $: allowEditCategory = status === undefined

  let total: number = 0

  const query = createQuery()

  $: if (status?._id !== undefined) {
    query.query(
      task.class.Task,
      { status: status?._id, kind: _taskType._id },
      (res) => {
        total = res.total
      },
      { limit: 1, total: true }
    )
  } else {
    query.unsubscribe()
    total = 0
  }

  $: needUpdate =
    (status === undefined ||
      status.name.trim() !== value.trim() ||
      description !== status?.description ||
      color !== status.color) &&
    value.trim() !== '' &&
    !selectableStates.some((it) => it.name === value)

  async function save (): Promise<void> {
    if (readonly) return
    if (total > 0 && value.trim() !== status?.name?.trim()) {
      // We should ask for changes approve.
      showPopup(
        ApproveStatusRenamePopup,
        {
          object: status,
          total,
          okAction: async () => {
            await performSave()
            closePopup()
          },
          label: task.string.RenameStatus
        },
        undefined
      )
    } else {
      await performSave()
    }
  }

  async function performSave (): Promise<void> {
    if (_taskType === undefined || _class === undefined) return
    if (status === undefined) {
      const _id = await createState(client, _class, {
        ofAttribute,
        name: value.trim(),
        category,
        color,
        description
      })

      const states = _taskType.statuses.map((p) => $statusStore.byId.get(p)).filter((p) => p !== undefined) as Status[]
      const lastIndex = states.findLastIndex((p) => p.category === category)
      const statuses = [..._taskType.statuses.slice(0, lastIndex + 1), _id, ..._taskType.statuses.slice(lastIndex + 1)]

      _type.statuses.push({
        _id,
        color,
        icon,
        taskType: _taskType._id
      })

      await client.update(_type, {
        statuses: calculateStatuses(_type, $taskTypeStore, [{ taskTypeId: _taskType._id, statuses }])
      })
      await client.update(_taskType, {
        statuses
      })
      _taskType.statuses = statuses
      status = await client.findOne(_class, { _id })
    } else if (needUpdate) {
      const _id = await createState(client, _class, {
        ofAttribute,
        name: value.trim(),
        category,
        color,
        description
      })
      const index = _taskType.statuses.indexOf(status._id)
      let statuses = [..._taskType.statuses.slice(0, index), _id, ..._taskType.statuses.slice(index + 1)]
      statuses = statuses.filter((it, idx, arr) => arr.indexOf(it) === idx)
      let found = false
      for (const status of _type.statuses) {
        if (status._id === _id) {
          status.color = color
          status.icon = icon as any // Fix me
          found = true
        }
      }
      if (!found) {
        _type.statuses.push({
          _id,
          color,
          icon,
          taskType: _taskType._id
        })
      }
      await client.update(_taskType, {
        statuses
      })
      _taskType.statuses = statuses
      await client.update(_type, {
        statuses: calculateStatuses(_type, $taskTypeStore, [{ taskTypeId: _taskType._id, statuses }])
      })
      if (status._id !== _id) {
        const oldStatus = status._id
        await renameStatuses(_type, _taskType, oldStatus, _id)
      }
      status = await client.findOne(_class, { _id })
    }

    const sameCategory = (
      _taskType.statuses
        .map((it) => $statusStore.byId.get(it))
        .filter((it) => it !== undefined)
        .filter((it) => it?.category === status?.category) as Status[]
    ).filter((it, idx, arr) => arr.findIndex((qt) => qt._id === it._id) === idx)

    canDelete = sameCategory.length > 1
    selectableStates = sameCategory.filter((it) => it._id !== status?._id)
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
    .findAllSync(core.class.StatusCategory, { _id: { $in: _taskType.statusCategories } })

  $: categories = allCategories.map((it) => ({
    id: it._id,
    label: it.label,
    icon: it.icon
  }))

  async function renameStatuses (
    type: ProjectType,
    taskType: TaskType,
    oldStatus: Ref<Status>,
    newStatus: Ref<Status>
  ): Promise<void> {
    if (readonly) return
    const projects = await client.findAll(task.class.Project, { type: type._id })
    while (true) {
      const docs = await client.findAll(
        task.class.Task,
        {
          status: oldStatus,
          kind: taskType._id,
          space: { $in: projects.map((p) => p._id) }
        },
        { limit: 1000 }
      )
      if (docs.length === 0) {
        break
      }

      const op = client.apply(undefined, 'rename-status')
      for (const d of docs) {
        await op.update(d, { status: newStatus })
      }
      await op.commit()
    }
  }

  function onDelete (): void {
    if (status === undefined || readonly) return
    const estatus = status
    showPopup(
      DeleteStateConfirmationPopup,
      {
        object: estatus,
        selectableStates,
        taskType: _taskType,
        deleteAction: async (newStatus: Status) => {
          const statuses = _taskType.statuses.filter((it) => it !== estatus._id)
          await client.update(_type, {
            statuses: calculateStatuses(_type, $taskTypeStore, [{ taskTypeId: _taskType._id, statuses }])
          })
          await client.update(_taskType, {
            statuses
          })

          await renameStatuses(_type, _taskType, estatus._id, newStatus._id)

          closePopup()

          $settingsStore = {
            id: newStatus._id,
            component: task.component.CreateStatePopup,
            props: {
              status: newStatus,
              taskType: _taskType,
              _class,
              category,
              type: _type,
              ofAttribute,
              icon,
              color,
              icons,
              readonly
            }
          }
        }
      },
      undefined
    )
  }

  function onDuplicate (): void {
    if (readonly) return
    let pattern = ''
    let inc = 2

    let prefix = value
    const g = value.match(/- ([0-9]+)/g)
    if (g != null) {
      prefix = value.split(g[0])[0].trim()
    }

    while (true) {
      pattern = prefix + ' - ' + (selectableStates.length + inc)
      if (selectableStates.some((it) => it.name === pattern) || status?.name === pattern) {
        // Duplicate
        inc++
      } else {
        break
      }
    }

    $settingsStore = {
      id: '#',
      component: task.component.CreateStatePopup,
      props: {
        status: undefined,
        taskType: _taskType,
        _class,
        category,
        type: _type,
        ofAttribute,
        icon,
        color,
        icons,
        valuePattern: pattern,
        readonly
      }
    }
  }
</script>

<Modal
  label={task.string.StatusPopupTitle}
  type={'type-aside'}
  okLabel={status === undefined ? presentation.string.Create : presentation.string.Save}
  okAction={save}
  canSave={needUpdate && !readonly}
  onCancel={() => {
    clearSettingsStore()
  }}
>
  <svelte:fragment slot="actions">
    {#if !readonly}
      <ButtonIcon
        icon={IconDelete}
        size={'small'}
        kind={'tertiary'}
        disabled={status === undefined || !canDelete || readonly}
        on:click={onDelete}
      />
      <ButtonIcon
        icon={IconCopy}
        size={'small'}
        kind={'tertiary'}
        disabled={status === undefined || readonly}
        on:click={onDuplicate}
      />
    {/if}
  </svelte:fragment>
  <div class="hulyModal-content__titleGroup">
    <ModernEditbox bind:value label={task.string.StatusName} size={'large'} kind={'ghost'} disabled={readonly} />
    <TextArea
      placeholder={task.string.Description}
      width={'100%'}
      height={'4.5rem'}
      margin={'var(--spacing-1) var(--spacing-2)'}
      noFocusBorder
      disabled={readonly}
      bind:value={description}
    />
  </div>
  <div class="hulyModal-content__settingsSet">
    <div class="hulyModal-content__settingsSet-line">
      <span class="label"><Label label={getEmbeddedLabel('Status Category')} /></span>
      <ButtonMenu
        items={categories}
        selected={category}
        disabled={!allowEditCategory || readonly}
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
          disabled={readonly}
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
            disabled={readonly}
            columns={'auto'}
            on:close={(evt) => {
              if (readonly) return
              color = evt.detail
              icon = undefined
            }}
          />
        {:else}
          <EmojiPopup
            embedded
            selected={fromCodePoint(color ?? 0)}
            disabled={readonly}
            on:close={(evt) => {
              if (readonly) return
              color = evt.detail.codePointAt(0)
              icon = iconWithEmoji
            }}
          />
        {/if}
      </div>
    </div>
  </div>
</Modal>
