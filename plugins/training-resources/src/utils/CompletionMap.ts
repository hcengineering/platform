//
// Copyright © 2024 Hardcore Engineering Inc.
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

import type { Employee } from '@hcengineering/contact'
import type { Ref } from '@hcengineering/core'
import { type TrainingAttempt, TrainingAttemptState, type TrainingRequest } from '@hcengineering/training'

export enum CompletionMapValueState {
  Passed,
  Failed,
  Draft,
  Pending
}

const completionMapValueStateOrder: CompletionMapValueState[] = [
  CompletionMapValueState.Passed,
  CompletionMapValueState.Failed,
  CompletionMapValueState.Draft,
  CompletionMapValueState.Pending
]

export function compareCompletionMapValueState (a: CompletionMapValueState, b: CompletionMapValueState): number {
  return completionMapValueStateOrder.indexOf(a) - completionMapValueStateOrder.indexOf(b)
}

export type CompletionMapValue =
  | {
    state: CompletionMapValueState.Pending
  }
  | {
    _id: TrainingAttempt['_id']
    seqNumber: TrainingAttempt['seqNumber']
    state: Exclude<CompletionMapValueState, CompletionMapValueState.Pending>
  }

export type CompletionMap = Map<Ref<Employee>, CompletionMapValue>

export function getCompletionMap (
  request: TrainingRequest,
  latestAttempts: Map<Ref<Employee>, TrainingAttempt>
): CompletionMap {
  const result = new Map<Ref<Employee>, CompletionMapValue>(
    request.trainees.map((trainee) => [
      trainee,
      {
        state: CompletionMapValueState.Pending
      }
    ])
  )

  for (const [trainee, latestAttempt] of latestAttempts) {
    let state: CompletionMapValueState
    switch (latestAttempt.state) {
      case TrainingAttemptState.Draft:
        state = CompletionMapValueState.Draft
        break
      case TrainingAttemptState.Passed:
        state = CompletionMapValueState.Passed
        break
      case TrainingAttemptState.Failed:
        state =
          request.maxAttempts === null || latestAttempt.seqNumber < request.maxAttempts
            ? CompletionMapValueState.Pending
            : CompletionMapValueState.Failed
        break
    }

    result.set(trainee, {
      _id: latestAttempt._id,
      seqNumber: latestAttempt.seqNumber,
      state
    })
  }

  return result
}
