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

import type { TxOperations } from '@hcengineering/core'
import { type TrainingState, trainingStateOrder } from '@hcengineering/training'

export async function trainingStateSort (_: TxOperations, states: TrainingState[]): Promise<TrainingState[]> {
  return states
    .slice()
    .sort((state1, state2) => trainingStateOrder.indexOf(state1) - trainingStateOrder.indexOf(state2))
}
