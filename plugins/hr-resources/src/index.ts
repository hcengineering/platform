//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { Resources } from '@hcengineering/platform'
import CreateDepartment from './components/CreateDepartment.svelte'
import DepartmentEditor from './components/DepartmentEditor.svelte'
import DepartmentStaff from './components/DepartmentStaff.svelte'
import EditDepartment from './components/EditDepartment.svelte'
import EditRequest from './components/EditRequest.svelte'
import Schedule from './components/Schedule.svelte'
import Structure from './components/Structure.svelte'
import TzDatePresenter from './components/TzDatePresenter.svelte'
import TzDateEditor from './components/TzDateEditor.svelte'
import RequestPresenter from './components/RequestPresenter.svelte'
import { showPopup } from '@hcengineering/ui'
import { Request } from '@hcengineering/hr'
import EditRequestType from './components/EditRequestType.svelte'

async function editRequestType (object: Request): Promise<void> {
  showPopup(EditRequestType, { object })
}

export default async (): Promise<Resources> => ({
  component: {
    Structure,
    CreateDepartment,
    EditDepartment,
    DepartmentStaff,
    DepartmentEditor,
    Schedule,
    EditRequest,
    TzDatePresenter,
    TzDateEditor,
    RequestPresenter,
    EditRequestType
  },
  actionImpl: {
    EditRequestType: editRequestType
  }
})
