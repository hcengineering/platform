//
// Copyright @ 2024 Hardcore Engineering Inc.
//
import { get } from 'svelte/store'
import { type Employee } from '@hcengineering/contact'
import { personRefByAccountUuidStore } from '@hcengineering/contact-resources'
import type { Training, TrainingRequest } from '@hcengineering/training'
import core, { notEmpty, type AttachedData, type Ref, type Role, type RolesAssignment } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import { navigate } from '@hcengineering/ui'
import training from '../plugin'
import { trainingRequestRoute } from '../routing/routes/trainingRequestRoute'
import { getCurrentEmployeeRef } from './getCurrentEmployeeRef'

export type CreateTrainingRequestData = Required<
Omit<AttachedData<TrainingRequest>, 'owner' | 'attempts' | 'canceledOn' | 'canceledBy'> & { roles: Array<Ref<Role>> }
>

export async function createTrainingRequest (
  parent: Training,
  data: CreateTrainingRequestData
): Promise<Ref<TrainingRequest>> {
  const client = getClient()

  const { roles, ...attachedData } = data
  if (roles.length > 0) {
    const traineesMap = new Map<Ref<Employee>, boolean>(attachedData.trainees.map((employeeRef) => [employeeRef, true]))

    const space = await client.findOne(
      core.class.TypedSpace,
      {
        _id: parent.space
      },
      {
        lookup: {
          type: core.class.SpaceType
        }
      }
    )

    if (space === undefined) {
      throw new Error(`Space #${parent.space} not found`)
    }

    const spaceType = space.$lookup?.type

    if (spaceType === undefined) {
      throw new Error(`Space type #${space.type} not found`)
    }

    const mixin = client.getHierarchy().as(space, spaceType.targetClass) as unknown as RolesAssignment
    const personRefByAccountUuid = get(personRefByAccountUuidStore)
    const employeeRefs = new Set(
      roles
        .map((roleId) => mixin[roleId] ?? [])
        .flat()
        .map((acc) => personRefByAccountUuid.get(acc))
        .filter(notEmpty)
    )

    for (const employeeRef of employeeRefs) {
      traineesMap.set(employeeRef, true)
    }

    attachedData.trainees = [...traineesMap.keys()]
  }

  const id = await client.addCollection(
    training.class.TrainingRequest,
    parent.space,
    parent._id,
    parent._class,
    'requests',
    {
      ...attachedData,
      owner: getCurrentEmployeeRef(),
      attempts: 0,
      canceledBy: null,
      canceledOn: null
    }
  )

  navigate(trainingRequestRoute.build({ id, tab: null }))

  return id
}
