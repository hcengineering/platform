//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type { Question } from '@hcengineering/questions'
import { getCurrentEmployeeRef } from './getCurrentEmployeeRef'

export function canUpdateQuestion (object: Question<unknown>): boolean {
  return (object.releasedOn === null || object.releasedOn > Date.now()) && object.owner === getCurrentEmployeeRef()
}
