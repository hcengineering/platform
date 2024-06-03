//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type { Answer, AnswerDataOf, Question } from '@hcengineering/questions'
import { type AttachedData, type Class, type Doc, type Ref, type Space, type TxOperations } from '@hcengineering/core'

export async function createAnswer<Parent extends Doc, Q extends Question<any>, A extends Answer<Q, any>> (
  client: TxOperations,
  classRef: Ref<Class<A>>,
  space: Ref<Space>,
  attachedTo: Ref<Parent>,
  attachedToClass: Ref<Class<Parent>>,
  collection: Extract<keyof Parent, string> | string,
  questionRef: Ref<Q>,
  answerData: AnswerDataOf<A>
): Promise<Ref<A>> {
  const data: AttachedData<Answer<Question<unknown>, unknown>> = {
    answerData,
    question: questionRef
  }
  return (await client.addCollection(classRef, space, attachedTo, attachedToClass, collection, data)) as Ref<A>
}
