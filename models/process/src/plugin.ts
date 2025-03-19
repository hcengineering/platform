// Copyright © 2025 Hardcore Engineering Inc.
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

import { type Doc, type Ref } from '@hcengineering/core'
import { type IntlString, mergeIds } from '@hcengineering/platform'
import { processId } from '@hcengineering/process'
import process from '@hcengineering/process-resources/src/plugin'
import { type Action } from '@hcengineering/view'

export default mergeIds(processId, process, {
  ids: {
    ProcessSettings: '' as Ref<Doc>
  },
  action: {
    RunProcess: '' as Ref<Action<Doc, any>>
  },
  string: {
    Done: '' as IntlString,
    ConfigLabel: '' as IntlString,
    ConfigDescription: '' as IntlString
  }
})
