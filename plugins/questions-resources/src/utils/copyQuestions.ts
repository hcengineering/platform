//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type { Question } from '@hcengineering/questions'
import core, { type AttachedDoc, type Doc, type Ref, type TxOperations } from '@hcengineering/core'
import { createQuestion, type CreateQuestionData } from './createQuestion'
import { findQuestions } from './findQuestions'

export async function copyQuestions<Parent extends Doc, Collection extends Extract<keyof Parent, string> | string> (
  client: TxOperations,
  from: Parent,
  collection: Collection,
  to: Ref<Parent>
): Promise<void> {
  const questionsToCopy: Array<Question<unknown>> = await findQuestions(from, collection)

  const ignoreKeys: Array<Exclude<keyof Question<unknown>, keyof CreateQuestionData<Question<unknown>>>> = [
    'owner',
    'releasedBy',
    'releasedOn',
    ...([...client.getHierarchy().getAllAttributes(core.class.AttachedDoc).keys()] as Array<keyof AttachedDoc>)
  ]

  await Promise.all(
    questionsToCopy.map(async (question) => {
      const data: CreateQuestionData<typeof question> = ignoreKeys.reduce((clone, key) => {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete clone[key]
        return clone
      }, structuredClone(question))

      return await createQuestion(client, question._class, from.space, to, from._class, collection, data)
    })
  )
}
