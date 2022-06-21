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
import { serverBoardId } from '@anticrm/server-board'
import { serverContactId } from '@anticrm/server-contact'
import { serverNotificationId } from '@anticrm/server-notification'
import { serverSettingId } from '@anticrm/server-setting'
import { serverChunterId } from '@anticrm/server-chunter'
import { serverTaskId } from '@anticrm/server-task'
import { serverTrackerId } from '@anticrm/server-tracker'
import { serverCalendarId } from '@anticrm/server-calendar'
import { serverGmailId } from '@anticrm/server-gmail'
import { serverTelegramId } from '@anticrm/server-telegram'


import { setMetadata } from '@anticrm/platform'

import devmodel, { devModelId } from '@anticrm/devmodel'
import client from '@anticrm/client'

export function configurePlatformDev() {  
    setMetadata(login.metadata.OverrideLoginToken, process.env.LOGIN_TOKEN_DEV)
    setMetadata(login.metadata.OverrideEndpoint, process.env.LOGIN_ENDPOINT_DEV)
    console.log('Use DEV server')
    addLocation(clientId, () => import(/* webpackChunkName: "client-dev" */ '@anticrm/dev-client-resources'))

    addLocation(serverAttachmentId, () => import(/* webpackChunkName: "server-attachment" */ '@anticrm/server-attachment-resources'))
    addLocation(serverBoardId, () => import(/* webpackChunkName: "server-attachment" */ '@anticrm/server-board-resources'))
    addLocation(serverContactId, () => import(/* webpackChunkName: "server-contact" */ '@anticrm/server-contact-resources'))
    addLocation(serverNotificationId, () => import(/* webpackChunkName: "server-notification" */ '@anticrm/server-notification-resources'))
    addLocation(serverSettingId, () => import(/* webpackChunkName: "server-setting" */ '@anticrm/server-setting-resources'))
    addLocation(serverChunterId, () => import(/* webpackChunkName: "server-chunter" */ '@anticrm/server-chunter-resources'))
    addLocation(serverTaskId, () => import/* webpackChunkName: "server-task" */ ('@anticrm/server-task-resources'))
    addLocation(serverTrackerId, () => import/* webpackChunkName: "server-tracker" */ ('@anticrm/server-tracker-resources'))
    addLocation(serverCalendarId, () => import/* webpackChunkName: "server-calendar" */ ('@anticrm/server-calendar-resources'))
    addLocation(serverGmailId, () => import/* webpackChunkName: "server-gmail" */ ('@anticrm/server-gmail-resources'))
    addLocation(serverTelegramId, () => import/* webpackChunkName: "server-telegram" */ ('@anticrm/server-telegram-resources'))

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
