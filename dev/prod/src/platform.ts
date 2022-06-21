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

import { addLocation } from '@anticrm/platform'

import login, { loginId } from '@anticrm/login'
import workbench, { workbenchId } from '@anticrm/workbench'
import uiPlugin from '@anticrm/ui'
import { viewId } from '@anticrm/view'
import { taskId } from '@anticrm/task'
import { contactId } from '@anticrm/contact'
import { chunterId } from '@anticrm/chunter'
import { recruitId } from '@anticrm/recruit'
import { activityId } from '@anticrm/activity'
import { automationId } from '@anticrm/automation'
import { settingId } from '@anticrm/setting'
import { telegramId } from '@anticrm/telegram'
import { attachmentId } from '@anticrm/attachment'
import { leadId } from '@anticrm/lead'
import { clientId } from '@anticrm/client'
import { gmailId } from '@anticrm/gmail'
import { imageCropperId } from '@anticrm/image-cropper'
import { inventoryId } from '@anticrm/inventory'
import { templatesId } from '@anticrm/templates'
import { notificationId } from '@anticrm/notification'
import { preferenceId } from '@anticrm/preference'
import { tagsId } from '@anticrm/tags'
import { calendarId } from '@anticrm/calendar'
import { trackerId } from '@anticrm/tracker'
import { boardId } from '@anticrm/board'
import { hrId } from '@anticrm/hr'
import rekoni from '@anticrm/rekoni'

import '@anticrm/login-assets'
import '@anticrm/task-assets'
import '@anticrm/view-assets'
import '@anticrm/chunter-assets'
import '@anticrm/attachment-assets'
import '@anticrm/contact-assets'
import '@anticrm/recruit-assets'
import '@anticrm/activity-assets'
import '@anticrm/automation-assets'
import '@anticrm/setting-assets'
import '@anticrm/telegram-assets'
import '@anticrm/lead-assets'
import '@anticrm/gmail-assets'
import '@anticrm/workbench-assets'
import '@anticrm/inventory-assets'
import '@anticrm/templates-assets'
import '@anticrm/notification-assets'
import '@anticrm/tags-assets'
import '@anticrm/calendar-assets'
import '@anticrm/tracker-assets'
import '@anticrm/board-assets'
import '@anticrm/preference-assets'
import '@anticrm/hr-assets'
import presentation, { presentationId } from '@anticrm/presentation'
import { coreId } from '@anticrm/core'
import { textEditorId } from '@anticrm/text-editor'

import { setMetadata } from '@anticrm/platform'


export async function configurePlatform() {  
  const config = await (await fetch('/config.json')).json()
  console.log('loading configuration', config)
  setMetadata(login.metadata.AccountsUrl, config.ACCOUNTS_URL)
  setMetadata(login.metadata.UploadUrl,  config.UPLOAD_URL)       
  
  if( config.MODEL_VERSION != null) {
    console.log('Minimal Model version requirement', config.MODEL_VERSION)
    setMetadata(presentation.metadata.RequiredVersion, config.MODEL_VERSION)
  }
  setMetadata(login.metadata.TelegramUrl, process.env.TELEGRAM_URL ?? 'http://localhost:8086')
  setMetadata(login.metadata.GmailUrl, process.env.GMAIL_URL ?? 'http://localhost:8087')
  setMetadata(login.metadata.OverrideEndpoint, process.env.LOGIN_ENDPOINT)
  setMetadata(login.metadata.FrontUrl, process.env.FRONT_URL)
  
  setMetadata(rekoni.metadata.RekoniUrl, process.env.REKONI_URL)

  setMetadata(uiPlugin.metadata.DefaultApplication, workbench.component.WorkbenchApp )

  addLocation(coreId, async () => ({ default: async () => ({}) }))
  addLocation(presentationId, async () => ({ default: async () => ({}) }))
  addLocation(textEditorId, async () => ({ default: async () => ({}) }))

  addLocation(clientId, () => import(/* webpackChunkName: "client" */ '@anticrm/client-resources'))
  addLocation(loginId, () => import(/* webpackChunkName: "login" */ '@anticrm/login-resources'))
  addLocation(workbenchId, () => import(/* webpackChunkName: "workbench" */ '@anticrm/workbench-resources'))
  addLocation(viewId, () => import(/* webpackChunkName: "view" */ '@anticrm/view-resources'))
  addLocation(taskId, () => import(/* webpackChunkName: "task" */ '@anticrm/task-resources'))
  addLocation(contactId, () => import(/* webpackChunkName: "contact" */ '@anticrm/contact-resources'))
  addLocation(chunterId, () => import(/* webpackChunkName: "chunter" */ '@anticrm/chunter-resources'))
  addLocation(recruitId, () => import(/* webpackChunkName: "recruit" */ '@anticrm/recruit-resources'))
  addLocation(activityId, () => import(/*webpackChunkName: "activity" */ '@anticrm/activity-resources'))
  addLocation(settingId, () => import(/* webpackChunkName: "setting" */ '@anticrm/setting-resources'))
  addLocation(leadId, () => import(/* webpackChunkName: "lead" */ '@anticrm/lead-resources'))
  addLocation(telegramId, () => import(/* webpackChunkName: "telegram" */ '@anticrm/telegram-resources'))
  addLocation(attachmentId, () => import(/* webpackChunkName: "attachment" */ '@anticrm/attachment-resources'))
  addLocation(gmailId, () => import(/* webpackChunkName: "gmail" */ '@anticrm/gmail-resources'))
  addLocation(imageCropperId, () => import(/* webpackChunkName: "image-cropper" */ '@anticrm/image-cropper-resources'))
  addLocation(inventoryId, () => import(/* webpackChunkName: "inventory" */ '@anticrm/inventory-resources'))
  addLocation(templatesId, () => import(/* webpackChunkName: "templates" */ '@anticrm/templates-resources'))
  addLocation(notificationId, () => import(/* webpackChunkName: "notification" */ '@anticrm/notification-resources'))
  addLocation(tagsId, () => import(/* webpackChunkName: "tags" */ '@anticrm/tags-resources'))
  addLocation(calendarId, () => import(/* webpackChunkName: "calendar" */ '@anticrm/calendar-resources'))

  addLocation(trackerId, () => import(/* webpackChunkName: "tracker" */ '@anticrm/tracker-resources'))
  addLocation(boardId, () => import(/* webpackChunkName: "board" */ '@anticrm/board-resources'))
  addLocation(automationId, () => import(/* webpackChunkName: "automation" */ '@anticrm/automation-resources'))
  addLocation(hrId, () => import(/* webpackChunkName: "hr" */ '@anticrm/hr-resources'))

  setMetadata(workbench.metadata.PlatformTitle, 'Platform')
}
