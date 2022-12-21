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

import { addLocation } from '@hcengineering/platform'

import login from '@hcengineering/login'
import { clientId } from '@hcengineering/client'
import { serverAttachmentId } from '@hcengineering/server-attachment'
import { serverContactId } from '@hcengineering/server-contact'
import { serverNotificationId } from '@hcengineering/server-notification'
import { serverSettingId } from '@hcengineering/server-setting'
import { serverChunterId } from '@hcengineering/server-chunter'
import { serverInventoryId } from '@hcengineering/server-inventory'
import { serverLeadId } from '@hcengineering/server-lead'
import { serverRecruitId } from '@hcengineering/server-recruit'
import { serverTaskId } from '@hcengineering/server-task'
import { serverTrackerId } from '@hcengineering/server-tracker'
import { serverTagsId } from '@hcengineering/server-tags'
import { serverCalendarId } from '@hcengineering/server-calendar'
import { serverGmailId } from '@hcengineering/server-gmail'
import { serverTelegramId } from '@hcengineering/server-telegram'
import { serverHrId } from '@hcengineering/server-hr'
import { serverRequestId } from '@hcengineering/server-request'

import { setMetadata } from '@hcengineering/platform'

import devmodel, { devModelId } from '@hcengineering/devmodel'
import client from '@hcengineering/client'

export function configurePlatformDev() {  
    setMetadata(login.metadata.OverrideLoginToken, process.env.LOGIN_TOKEN_DEV)
    setMetadata(login.metadata.OverrideEndpoint, process.env.LOGIN_ENDPOINT_DEV)
    console.log('Use DEV server')
    addLocation(clientId, () => import(/* webpackChunkName: "client-dev" */ '@hcengineering/dev-client-resources'))

    addLocation(serverAttachmentId, () => import(/* webpackChunkName: "server-attachment" */ '@hcengineering/server-attachment-resources'))
    addLocation(serverContactId, () => import(/* webpackChunkName: "server-contact" */ '@hcengineering/server-contact-resources'))
    addLocation(serverNotificationId, () => import(/* webpackChunkName: "server-notification" */ '@hcengineering/server-notification-resources'))
    addLocation(serverSettingId, () => import(/* webpackChunkName: "server-setting" */ '@hcengineering/server-setting-resources'))
    addLocation(serverChunterId, () => import(/* webpackChunkName: "server-chunter" */ '@hcengineering/server-chunter-resources'))
    addLocation(serverInventoryId, () => import(/* webpackChunkName: "server-inventory" */ '@hcengineering/server-inventory-resources'))
    addLocation(serverLeadId, () => import(/* webpackChunkName: "server-lead" */ '@hcengineering/server-lead-resources'))
    addLocation(serverRecruitId, () => import(/* webpackChunkName: "server-recruit" */ '@hcengineering/server-recruit-resources'))
    addLocation(serverTaskId, () => import/* webpackChunkName: "server-task" */ ('@hcengineering/server-task-resources'))
    addLocation(serverTrackerId, () => import/* webpackChunkName: "server-tracker" */ ('@hcengineering/server-tracker-resources'))
    addLocation(serverTagsId, () => import/* webpackChunkName: "server-tags" */ ('@hcengineering/server-tags-resources'))
    addLocation(serverCalendarId, () => import/* webpackChunkName: "server-calendar" */ ('@hcengineering/server-calendar-resources'))
    addLocation(serverGmailId, () => import/* webpackChunkName: "server-gmail" */ ('@hcengineering/server-gmail-resources'))
    addLocation(serverTelegramId, () => import/* webpackChunkName: "server-telegram" */ ('@hcengineering/server-telegram-resources'))
    addLocation(serverHrId, () => import(/* webpackChunkName: "server-hr" */ '@hcengineering/server-hr-resources'))
    addLocation(serverRequestId, () => import(/* webpackChunkName: "server-request" */ '@hcengineering/server-request-resources'))
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
  addLocation(devModelId, () => import(/* webpackChunkName: "devmodel" */ '@hcengineering/devmodel-resources'))
}
