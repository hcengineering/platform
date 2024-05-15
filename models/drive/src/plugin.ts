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

import type { Ref } from '@hcengineering/core'
import {} from '@hcengineering/core'
import { driveId } from '@hcengineering/drive'
import drive from '@hcengineering/drive-resources/src/plugin'
import { type IntlString, mergeIds } from '@hcengineering/platform'
import { type AnyComponent } from '@hcengineering/ui'
import { type Action, type ActionCategory, type ViewAction, type Viewlet } from '@hcengineering/view'

export default mergeIds(driveId, drive, {
  component: {
    CreateDrive: '' as AnyComponent,
    DriveSpacePresenter: '' as AnyComponent
  },
  viewlet: {
    DriveTable: '' as Ref<Viewlet>
  },
  category: {
    Drive: '' as Ref<ActionCategory>
  },
  action: {
    CreateChildFolder: '' as Ref<Action>,
    CreateRootFolder: '' as Ref<Action>,
    EditDrive: '' as Ref<Action>
  },
  actionImpl: {
    CreateChildFolder: '' as ViewAction,
    CreateRootFolder: '' as ViewAction,
    EditDrive: '' as ViewAction
  },
  string: {
    Name: '' as IntlString,
    Description: '' as IntlString,
    Size: '' as IntlString,
    Type: '' as IntlString,
    Parent: '' as IntlString,
    Path: '' as IntlString,
    Drives: '' as IntlString
  }
})
