/*!
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
*/

import onboard, { onboardId } from '@hcengineering/onboard'
import type { IntlString, StatusCode } from '@hcengineering/platform'
import { mergeIds } from '@hcengineering/platform'

export default mergeIds(onboardId, onboard, {
  status: {
    RequiredField: '' as StatusCode<{ field: string }>,
    FieldsDoNotMatch: '' as StatusCode<{ field: string, field2: string }>,
    ConnectingToServer: '' as StatusCode
  },
  string: {
    CreateWorkspace: '' as IntlString,
    LastName: '' as IntlString,
    FirstName: '' as IntlString,
    Workspace: '' as IntlString,
    FillInProfile: '' as IntlString,
    SetUpPassword: '' as IntlString,
    Next: '' as IntlString,
    Skip: '' as IntlString,
    SignUpCompleted: '' as IntlString,
    StartUsingHuly: '' as IntlString
  }
})
