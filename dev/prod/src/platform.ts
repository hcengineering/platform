//
// Copyright © 2020 Anticrm Platform Contributors.
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

import { addLocation } from '@anticrm/platform'

import { loginId } from '@anticrm/login'
import { clientId } from '@anticrm/client'
import { workbenchId } from '@anticrm/workbench'
import { viewId } from '@anticrm/view'
import { taskId } from '@anticrm/task'
import { contactId } from '@anticrm/contact'
import { chunterId } from '@anticrm/chunter'
import { recruitId } from '@anticrm/recruit'

// import { chunterServerId } from '@anticrm/chunter-server'

import '@anticrm/login-assets'
import '@anticrm/task-assets'
import '@anticrm/view-assets'
import '@anticrm/chunter-assets'
import '@anticrm/recruit-assets'

export function configurePlatform() {

// platform.setMetadata(ui.metadata.LoginApplication, 'login')
// platform.setMetadata(ui.metadata.DefaultApplication, 'workbench')

  // if (process.env.CLIENT === 'dev')
  addLocation(clientId, () => import(/* webpackChunkName: "client-dev" */ '@anticrm/dev-client-resources'))
  // else
  //   addLocation(core, () => import(/* webpackChunkName: "plugin-core" */ '@anticrm/plugin-core-impl'))

  addLocation(loginId, () => import(/* webpackChunkName: "login" */ '@anticrm/login-resources'))
  addLocation(workbenchId, () => import(/* webpackChunkName: "workbench" */ '@anticrm/workbench-resources'))
  addLocation(viewId, () => import(/* webpackChunkName: "view" */ '@anticrm/view-resources'))
  addLocation(taskId, () => import(/* webpackChunkName: "task" */ '@anticrm/task-resources'))
  addLocation(contactId, () => import(/* webpackChunkName: "contact" */ '@anticrm/contact-resources'))
  addLocation(chunterId, () => import(/* webpackChunkName: "chunter" */ '@anticrm/chunter-resources'))
  addLocation(recruitId, () => import(/* webpackChunkName: "recruit" */ '@anticrm/recruit-resources'))
  
  // addLocation(chunterServerId, () => import(/* webpackChunkName: "chunter-server" */ '@anticrm/chunter-server'))

}
