//
// Copyright © 2022 Hardcore Engineering Inc.
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

import activity, { type DocUpdateMessage } from '@hcengineering/activity'
import {
  DOMAIN_MODEL_TX,
  DOMAIN_STATUS,
  DOMAIN_TX,
  TxOperations,
  toIdMap,
  type Attribute,
  type Class,
  type Doc,
  type Ref,
  type Space,
  type Status,
  type TxCreateDoc,
  type TxUpdateDoc
} from '@hcengineering/core'
import {
  createOrUpdate,
  migrateSpace,
  migrateSpaceRanks,
  tryMigrate,
  tryUpgrade,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient,
  type ModelLogger
} from '@hcengineering/model'
import { DOMAIN_ACTIVITY } from '@hcengineering/model-activity'
import core, { DOMAIN_SPACE } from '@hcengineering/model-core'
import tags from '@hcengineering/model-tags'
import {
  taskId,
  type Project,
  type ProjectStatus,
  type ProjectType,
  type ProjectTypeDescriptor,
  type Task,
  type TaskType
} from '@hcengineering/task'

import { DOMAIN_KANBAN, DOMAIN_TASK } from '.'
import task from './plugin'

/**
 * @public
 */
export async function createSequence (tx: TxOperations, _class: Ref<Class<Doc>>): Promise<void> {
  if ((await tx.findOne(task.class.Sequence, { attachedTo: _class })) === undefined) {
    await tx.createDoc(task.class.Sequence, core.space.Workspace, {
      attachedTo: _class,
      sequence: 0
    })
  }
}

export async function migrateDefaultStatusesBase<T extends Task> (
  client: MigrationClient,
  logger: ModelLogger,
  defaultTypeId: Ref<ProjectType>,
  typeDescriptor: Ref<ProjectTypeDescriptor>,
  baseClass: Ref<Class<Space>>,
  defaultTaskTypeId: Ref<TaskType>,
  taskTypeClass: Ref<Class<TaskType>>,
  baseTaskClass: Ref<Class<T>>,
  statusAttributeOf: Ref<Attribute<Status>>,
  statusClass: Ref<Class<Status>>,
  getDefaultStatus: (oldStatus: Status) => Ref<Status> | undefined,
  migrateProjects?: (getNewStatus: (oldStatus: Ref<Status>) => Ref<Status>) => Promise<void>
): Promise<void> {
  const h = client.hierarchy
  const baseTaskClasses = h.getDescendants(baseTaskClass).filter((it) => !h.isMixin(it))

  let counter = 0
  // There are several cases possible based on the history of the workspace
  // 1. One system default type - pretty fresh or already migrated workspace.
  // Proceed with the regular scenario.
  // 2. One custom default type (modifiedBy user or ConfigUser) - migrated system type.
  // 2.a. If modified by ConfigUser - proceed with the regular scenario. Update to become modified by system.
  // 2.b. If modified by user - update to use the new ID of the type.
  // 3. More than one type (one system and one custom) - the tool is running after the WS upgrade.
  // Not supported for now. Alternatively - Proceed with (2) scenario for the custom one. Delete it in the end.

  const defaultTypes = await client.find<TxCreateDoc<ProjectType>>(DOMAIN_MODEL_TX, {
    _class: core.class.TxCreateDoc,
    objectId: defaultTypeId,
    objectSpace: core.space.Model,
    'attributes.descriptor': typeDescriptor
  })

  if (defaultTypes.length === 2) {
    logger.log('Are you running the tool after the workspace has been upgraded?', '')
    logger.error('NOT SUPPORTED. EXITING.', '')
    return
  } else if (defaultTypes.length === 0) {
    logger.log('No default type found. Was custom and already migrated? Nothing to do.', '')
    return
  }

  const defaultType = defaultTypes[0]
  logger.log('Default type', defaultType)

  if (defaultType.modifiedBy !== core.account.System) {
    let moveToCustom = false
    if (defaultType.modifiedBy === core.account.ConfigUser) {
      // Can only move to system if the task is with the system id
      // and not modified by user
      if (defaultType.attributes.tasks.length === 1 && defaultType.attributes.tasks[0] === defaultTaskTypeId) {
        const defaultTaskType = (
          await client.find<TxCreateDoc<TaskType>>(DOMAIN_MODEL_TX, {
            _class: core.class.TxCreateDoc,
            objectId: defaultTaskTypeId,
            objectSpace: core.space.Model,
            'attributes.parent': defaultTypeId
          })
        )[0]

        if (defaultTaskType?.modifiedBy === core.account.ConfigUser) {
          logger.log('Moving the existing default type created by ConfigUser to a system one', '')
          logger.log('Moving the existing default task type created by ConfigUser to a system one', '')
          await client.update(
            DOMAIN_MODEL_TX,
            { _id: defaultTaskType._id },
            {
              $set: {
                modifiedBy: core.account.System
              }
            }
          )

          await client.update(
            DOMAIN_MODEL_TX,
            { _id: defaultType._id },
            {
              $set: {
                modifiedBy: core.account.System
              }
            }
          )
        } else if (defaultTaskType?.modifiedBy !== core.account.System) {
          logger.log('Default task type has been modified by user.', '')
          logger.error('NOT SUPPORTED. EXITING.', '')
          return
        }
      } else {
        moveToCustom = true
      }
    }

    if (defaultType.modifiedBy !== core.account.ConfigUser || moveToCustom) {
      // modified by user
      // Update to use the new ID of the type if no default task type
      if (defaultType.attributes.tasks.includes(defaultTaskTypeId)) {
        logger.log('Default type has been modified by user and it contains default task type', '')
        logger.error('NOT SUPPORTED. EXITING.', '')
        return
      }

      logger.log('Moving the existing default type to a custom one', '')
      const newId = defaultType.objectId + '-custom'
      await client.update(
        DOMAIN_MODEL_TX,
        { _id: defaultType._id },
        {
          $set: {
            'attributes.name': defaultType.attributes.name + ' (custom)',
            objectId: newId
          }
        }
      )
      await client.update(
        DOMAIN_MODEL_TX,
        {
          objectId: defaultType.objectId,
          objectSpace: core.space.Model
        },
        {
          $set: {
            objectId: newId
          }
        }
      )
      await client.update(
        DOMAIN_MODEL_TX,
        {
          objectId: { $in: defaultType.attributes.tasks },
          objectSpace: core.space.Model,
          'attributes.parent': defaultTypeId
        },
        {
          $set: {
            'attributes.parent': newId
          }
        }
      )
      await client.update(
        DOMAIN_SPACE,
        {
          _class: baseClass,
          type: defaultTypeId
        },
        {
          $set: { type: newId }
        }
      )
    }
  }

  const statusClasses = h.getDescendants(core.class.Status).filter((it) => !h.isMixin(it))

  // Check all statuses that haven't been already migrated
  // Check statuses of specific attribute
  const oldStatusesSpecific = await client.find<Status>(DOMAIN_STATUS, {
    _class: { $in: statusClasses },
    ofAttribute: statusAttributeOf,
    __superseded: { $exists: false }
  })

  // Also, check all statuses in the projects with generic task attribute
  const projectTypes = await client.model.findAll<ProjectType>(task.class.ProjectType, {
    space: core.space.Model,
    descriptor: typeDescriptor
  })

  const projectStatuses = new Set<Ref<Status>>()

  for (const pt of projectTypes) {
    for (const status of pt.statuses) {
      projectStatuses.add(status._id)
    }
  }

  const oldStatusesGenericProjects = await client.find<Status>(DOMAIN_STATUS, {
    _class: { $in: statusClasses },
    _id: { $in: [...projectStatuses] },
    ofAttribute: task.attribute.State,
    __superseded: { $exists: false }
  })

  const oldStatuses = [...oldStatusesSpecific, ...oldStatusesGenericProjects]

  // Build statuses mapping oldId -> {category, newId}
  const statusMapping: Record<Ref<Status>, Ref<Status>> = {}
  for (const s of oldStatuses) {
    const defaultStatusId = getDefaultStatus(s)

    if (defaultStatusId === undefined || defaultStatusId === s._id) {
      continue
    }

    statusMapping[s._id] = defaultStatusId
  }

  logger.log('Status mapping', statusMapping)

  if (Object.entries(statusMapping).length === 0) {
    logger.log('All statuses have been already migrated or running on upgraded workspace', '')
    return
  }

  const statusIdsBeingMigrated = Object.keys(statusMapping) as Ref<Status>[]

  // Migration

  function getNewProjectStatus (status: ProjectStatus): ProjectStatus {
    const newId = statusMapping[status._id]

    if (newId === undefined) {
      return status
    }

    return { ...status, _id: newId }
  }

  function getNewStatus (status: Ref<Status>): Ref<Status> {
    return statusMapping[status] ?? status
  }

  // For project types with the same descriptor
  // 1. Update all create TXes with statuses
  // 1. Update all update TXes with statuses
  // 2. Update all push TXes with statuses

  const projectTypeStatusesCreates = await client.find<TxCreateDoc<ProjectType>>(DOMAIN_MODEL_TX, {
    _class: core.class.TxCreateDoc,
    objectClass: task.class.ProjectType,
    objectSpace: core.space.Model,
    'attributes.descriptor': typeDescriptor
  })

  logger.log('projectTypeStatusesCreates: ', projectTypeStatusesCreates.length)

  counter = 0
  for (const ptsCreate of projectTypeStatusesCreates) {
    const newUpdateStatuses = ptsCreate.attributes.statuses?.map(getNewProjectStatus)

    if (areSameArrays(newUpdateStatuses, ptsCreate.attributes.statuses)) {
      continue
    }

    counter++
    await client.update(DOMAIN_MODEL_TX, { _id: ptsCreate._id }, { $set: { 'attributes.statuses': newUpdateStatuses } })
  }
  logger.log('projectTypeStatusesCreates updated: ', counter)

  const projectTypeStatusesUpdates = await client.find<TxUpdateDoc<ProjectType>>(DOMAIN_MODEL_TX, {
    _class: core.class.TxUpdateDoc,
    objectId: { $in: projectTypeStatusesCreates.map((sc) => sc.objectId) },
    objectClass: task.class.ProjectType,
    objectSpace: core.space.Model,
    'operations.statuses': { $exists: true }
  })
  logger.log('projectTypeStatusesUpdates: ', projectTypeStatusesUpdates.length)

  counter = 0
  for (const ptsUpdate of projectTypeStatusesUpdates) {
    const newUpdateStatuses = ptsUpdate.operations.statuses?.map(getNewProjectStatus)

    if (areSameArrays(newUpdateStatuses, ptsUpdate.operations.statuses)) {
      continue
    }

    counter++
    await client.update(DOMAIN_MODEL_TX, { _id: ptsUpdate._id }, { $set: { 'operations.statuses': newUpdateStatuses } })
  }
  logger.log('projectTypeStatusesUpdates updated: ', counter)

  const projectTypeStatusesPushes = await client.find<TxUpdateDoc<ProjectType>>(DOMAIN_MODEL_TX, {
    _class: core.class.TxUpdateDoc,
    objectId: { $in: projectTypeStatusesCreates.map((sc) => sc.objectId) },
    objectClass: task.class.ProjectType,
    objectSpace: core.space.Model,
    'operations.$push.statuses': { $exists: true }
  })

  logger.log('projectTypeStatusesPushes: ', projectTypeStatusesPushes.length)

  counter = 0
  for (const ptsUpdate of projectTypeStatusesPushes) {
    const pushedProjectStatus = ptsUpdate.operations.$push?.statuses
    if (pushedProjectStatus === undefined) {
      continue
    }

    const newPushStatus = getNewProjectStatus(pushedProjectStatus as ProjectStatus)

    if (pushedProjectStatus === newPushStatus) {
      continue
    }

    counter++
    await client.update(
      DOMAIN_MODEL_TX,
      { _id: ptsUpdate._id },
      { $set: { 'operations.$push.statuses': newPushStatus } }
    )
  }
  logger.log('projectTypeStatusesPushes updated: ', counter)

  // All task types
  // 1. Update create TX
  // 2. Update all update TXes with statuses

  const allTaskTypes = await client.find<TxCreateDoc<TaskType>>(DOMAIN_MODEL_TX, {
    _class: core.class.TxCreateDoc,
    objectClass: taskTypeClass,
    'attributes.ofClass': { $in: baseTaskClasses }
  })

  logger.log('allTaskTypes: ', allTaskTypes.length)

  counter = 0
  for (const taskType of allTaskTypes) {
    const newTaskTypeStatuses = taskType.attributes.statuses.map(getNewStatus)

    if (areSameArrays(newTaskTypeStatuses, taskType.attributes.statuses)) {
      continue
    }

    counter++
    await client.update(
      DOMAIN_MODEL_TX,
      { _id: taskType._id },
      { $set: { 'attributes.statuses': newTaskTypeStatuses } }
    )
  }
  logger.log('allTaskTypes updated: ', counter)

  const allTaskTypeStatusesUpdates = await client.find<TxUpdateDoc<TaskType>>(DOMAIN_MODEL_TX, {
    _class: core.class.TxUpdateDoc,
    objectClass: taskTypeClass,
    objectId: { $in: allTaskTypes.map((tt) => tt.objectId) },
    'operations.statuses': { $exists: true }
  })

  logger.log('allTaskTypeStatusesUpdates: ', allTaskTypeStatusesUpdates.length)

  counter = 0
  for (const ttsUpdate of allTaskTypeStatusesUpdates) {
    const newTaskTypeUpdateStatuses = ttsUpdate.operations.statuses?.map(getNewStatus)

    logger.log('newTaskTypeUpdateStatuses for ' + ttsUpdate._id, newTaskTypeUpdateStatuses)

    if (areSameArrays(newTaskTypeUpdateStatuses, ttsUpdate.operations.statuses)) {
      logger.log('Nothing to update', '')
      continue
    }

    counter++
    await client.update(
      DOMAIN_MODEL_TX,
      { _id: ttsUpdate._id },
      { $set: { 'operations.statuses': newTaskTypeUpdateStatuses } }
    )
  }
  logger.log('allTaskTypeStatusesUpdates updated: ', counter)

  await migrateProjects?.(getNewStatus)

  // For all Tasks:
  // 1. status
  // 2. TxCollectionCUD:TxCreateDoc
  // 3. TxCollectionCUD:TxUpdateDoc
  // 3. DocUpdateMessage:action:update&attributeUpdates:attrKey:status

  const affectedBaseTasks = await client.find<Task>(DOMAIN_TASK, {
    _class: { $in: baseTaskClasses },
    status: { $in: statusIdsBeingMigrated }
  })

  logger.log('affectedBaseTasks: ', affectedBaseTasks.length)

  counter = 0
  for (const baseTask of affectedBaseTasks) {
    const newStatus = getNewStatus(baseTask.status)

    if (newStatus !== baseTask.status) {
      counter++
      await client.update(DOMAIN_TASK, { _id: baseTask._id }, { $set: { status: newStatus } })
    }
  }
  logger.log('affectedBaseTasks updated: ', counter)

  const baseTaskUpdateMessages = await client.find<DocUpdateMessage>(DOMAIN_ACTIVITY, {
    _class: activity.class.DocUpdateMessage,
    action: 'update',
    objectClass: { $in: baseTaskClasses },
    'attributeUpdates.attrKey': 'status',
    'attributeUpdates.set.0.': { $in: statusIdsBeingMigrated }
  })

  logger.log('Base task update messages: ', baseTaskUpdateMessages.length)

  counter = 0
  for (const updateMessage of baseTaskUpdateMessages) {
    const statusSet = updateMessage.attributeUpdates?.set[0]
    const newStatusSet = statusSet != null ? getNewStatus(statusSet as Ref<Status>) : statusSet

    if (statusSet !== newStatusSet) {
      counter++
      await client.update(
        DOMAIN_ACTIVITY,
        { _id: updateMessage._id },
        { $set: { 'attributeUpdates.set.0': newStatusSet } }
      )
    }
  }
  logger.log('Base task update messages updated: ', counter)

  logger.log('Updating statuses themselves:', '')
  const createdStatuses = new Set<Ref<Status>>()
  for (const statusIdBeingMigrated of statusIdsBeingMigrated) {
    const newStatus = getNewStatus(statusIdBeingMigrated)

    logger.log('Updating status from ' + statusIdBeingMigrated + ' to ' + newStatus, '')

    await client.update(DOMAIN_STATUS, { _id: statusIdBeingMigrated }, { $set: { __superseded: true } })

    if (!createdStatuses.has(newStatus)) {
      const oldStatus = oldStatuses.find((s) => s._id === statusIdBeingMigrated)
      if (oldStatus === undefined) {
        logger.log('Old status not found: ', statusIdBeingMigrated)
        continue
      }

      try {
        createdStatuses.add(newStatus)
        await client.create(DOMAIN_STATUS, {
          ...oldStatus,
          _class: statusClass,
          _id: newStatus as any,
          ofAttribute: statusAttributeOf,
          __migratedFrom: statusIdBeingMigrated
        })
      } catch (e: any) {
        logger.log('Could not create new status: ', e.message)
        // Might be already created
      }
    }
  }
  logger.log('Statuses created: ', createdStatuses.size)
  logger.log('Statuses updated: ', statusIdsBeingMigrated.length)
}

async function migrateRanks (client: MigrationClient): Promise<void> {
  const classes = client.hierarchy.getDescendants(task.class.Project)
  for (const _class of classes) {
    const spaces = await client.find<Project>(DOMAIN_SPACE, { _class })
    for (const space of spaces) {
      await migrateSpaceRanks(client, DOMAIN_TASK, space)
    }
  }
}

function areSameArrays (arr1: any[] | undefined, arr2: any[] | undefined): boolean {
  if (arr1 === arr2) {
    return true
  }

  if (arr1 === undefined || arr2 === undefined) {
    return false
  }

  return arr1.length === arr2.length && arr1.every((elem, idx) => elem === arr2[idx])
}

export const taskOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, taskId, [
      {
        state: 'migrate-tt-model-states',
        func: async (client) => {
          const prTaskTypes = client.model.findAllSync(task.class.TaskType, {})

          const allModelStatuses = toIdMap(client.model.findAllSync(core.class.Status, {}))
          for (const tt of prTaskTypes) {
            const missing = tt.statuses.filter((it) => !allModelStatuses.has(it))
            await client.update(
              DOMAIN_TX,
              { objectId: { $in: missing }, objectSpace: 'task:space:Statuses' },
              { $set: { objectSpace: core.space.Model } }
            )
            await client.update(
              DOMAIN_MODEL_TX,
              { objectId: { $in: missing }, objectSpace: 'task:space:Statuses' },
              { $set: { objectSpace: core.space.Model } }
            )
            await client.move(DOMAIN_TX, { objectId: { $in: missing }, objectSpace: core.space.Model }, DOMAIN_MODEL_TX)
          }
        }
      },
      {
        state: 'removeDeprecatedSpace',
        func: async (client: MigrationClient) => {
          await migrateSpace(client, task.space.Sequence, core.space.Workspace, [DOMAIN_KANBAN])
        }
      },
      {
        state: 'migrateRanks',
        func: migrateRanks
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {
    await tryUpgrade(state, client, taskId, [
      {
        state: 'u-task-001',
        func: async (client) => {
          const tx = new TxOperations(client, core.account.System)

          await createOrUpdate(
            tx,
            tags.class.TagCategory,
            core.space.Workspace,
            {
              icon: tags.icon.Tags,
              label: 'Text Label',
              targetClass: task.class.Task,
              tags: [],
              default: true
            },
            task.category.TaskTag
          )
        }
      }
    ])
  }
}
