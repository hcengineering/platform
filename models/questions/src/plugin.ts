//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { questionsId } from '@hcengineering/questions'
import questions from '@hcengineering/questions-resources/src/plugin'
import type { Ref } from '@hcengineering/core'
import { mergeIds } from '@hcengineering/platform'
import type { ActionCategory } from '@hcengineering/view'

export default mergeIds(questionsId, questions, {
  actionCategory: {
    Questions: '' as Ref<ActionCategory>
  }
})
