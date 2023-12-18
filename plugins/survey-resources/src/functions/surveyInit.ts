//
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
//

import { type DocData, fillDefaults, type TxOperations } from '@hcengineering/core'
import type { Survey } from '@hcengineering/survey'
import survey from '../plugin'

export function surveyInit (client: TxOperations): DocData<Survey> {
  const hierarchy = client.getHierarchy()

  let object: DocData<Survey> = {
    name: '',
    description: '',
    private: true,
    members: [],
    questions: 0,
    archived: false
  }

  object = fillDefaults<Survey>(hierarchy, object, survey.class.Survey)

  return object
}
