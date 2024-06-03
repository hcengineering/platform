//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type { Question } from '@hcengineering/questions'
import { type AttachedData, type Class, type Doc, type Ref, type Space, type TxOperations } from '@hcengineering/core'
import { getCurrentEmployeeRef } from './getCurrentEmployeeRef'

export type CreateQuestionData<Q extends Question<any>> = Omit<AttachedData<Q>, 'owner' | 'releasedBy' | 'releasedOn'>

export async function createQuestion<Parent extends Doc, Q extends Question<any>> (
  client: TxOperations,
  classRef: Ref<Class<Q>>,
  space: Ref<Space>,
  attachedTo: Ref<Parent>,
  attachedToClass: Ref<Class<Parent>>,
  collection: Extract<keyof Parent, string> | string,
  question: CreateQuestionData<Q>
): Promise<Ref<Q>> {
  const owner = getCurrentEmployeeRef()
  return (await client.addCollection<Parent, Question<any>>(classRef, space, attachedTo, attachedToClass, collection, {
    ...question,
    owner,
    releasedBy: null,
    releasedOn: null
  })) as Ref<Q>
}
