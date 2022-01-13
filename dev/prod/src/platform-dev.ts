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
import { serverAttachmentId } from '@anticrm/server-attachment'

import { setMetadata } from '@anticrm/platform'

import devmodel, { devModelId } from '@anticrm/devmodel'
import client from '@anticrm/client'

export function configurePlatformDev() {  
    setMetadata(login.metadata.OverrideLoginToken, process.env.LOGIN_TOKEN_DEV)
    setMetadata(login.metadata.OverrideEndpoint, process.env.LOGIN_ENDPOINT_DEV)
    console.log('Use DEV server')
    addLocation(clientId, () => import(/* webpackChunkName: "client-dev" */ '@anticrm/dev-client-resources'))

    addLocation(serverAttachmentId, () => import(/* webpackChunkName: "server-attachment" */ '@anticrm/server-attachment-resources'))

    // Set devmodel to hook client to be able to present all activity
    enableDevModel()
}


export function configurePlatformDevServer() {  
  console.log('Use Endpoint override:', process.env.LOGIN_ENDPOINT)
  setMetadata(login.metadata.OverrideEndpoint, process.env.LOGIN_ENDPOINT)

  // Set devmodel to hook client to be able to present all activity
  enableDevModel()
}

function enableDevModel() {
  setMetadata(client.metadata.ClientHook, devmodel.hook.Hook)
  addLocation(devModelId, () => import(/* webpackChunkName: "devmodel" */ '@anticrm/devmodel-resources'))
}
