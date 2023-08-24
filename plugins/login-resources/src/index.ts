//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import InviteLink from './components/InviteLink.svelte'
import LoginApp from './components/LoginApp.svelte'
import { changePassword, getWorkspaces, leaveWorkspace, selectWorkspace, sendInvite } from './utils'
/*!
 * Anticrm Platform™ Login Plugin
 * © 2020, 2021 Anticrm Platform Contributors.
 * © 2021 Hardcore Engineering Inc. All Rights Reserved.
 * Licensed under the Eclipse Public License, Version 2.0
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  component: {
    LoginApp,
    InviteLink
  },
  function: {
    LeaveWorkspace: leaveWorkspace,
    ChangePassword: changePassword,
    SelectWorkspace: selectWorkspace,
    GetWorkspaces: getWorkspaces,
    SendInvite: sendInvite
  }
})

export * from './utils'
