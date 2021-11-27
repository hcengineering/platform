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

import login from '@anticrm/login'
import { clientId } from '@anticrm/client'
import { serverChunterId } from '@anticrm/server-chunter'
import { serverRecruitId } from '@anticrm/server-recruit'
import { serverViewId } from '@anticrm/server-view'

import { setMetadata } from '@anticrm/platform'
export function configurePlatformDev() {  
    setMetadata(login.metadata.OverrideLoginToken, process.env.LOGIN_TOKEN_DEV)
    setMetadata(login.metadata.OverrideEndpoint, process.env.LOGIN_ENDPOINT_DEV)
    console.log('Use DEV server')
    addLocation(clientId, () => import(/* webpackChunkName: "client-dev" */ '@anticrm/dev-client-resources'))
    addLocation(serverChunterId, () => import(/* webpackChunkName: "server-chunter" */ '@anticrm/dev-server-chunter-resources'))
    addLocation(serverRecruitId, () => import(/* webpackChunkName: "server-recruit" */ '@anticrm/server-recruit-resources'))
    addLocation(serverViewId, () => import(/* webpackChunkName: "server-view" */ '@anticrm/server-view-resources'))
}

export function configurePlatformDevServer() {  
  console.log('Use Endpoint override:', process.env.LOGIN_ENDPOINT)
  setMetadata(login.metadata.OverrideEndpoint, process.env.LOGIN_ENDPOINT)
}
