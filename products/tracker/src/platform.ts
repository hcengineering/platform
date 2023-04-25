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

import login, { loginId } from '@hcengineering/login'
import workbench, { workbenchId } from '@hcengineering/workbench'
import uiPlugin from '@hcengineering/ui'
import { viewId } from '@hcengineering/view'
import { taskId } from '@hcengineering/task'
import contact, { contactId } from '@hcengineering/contact'
import { chunterId } from '@hcengineering/chunter'
import { activityId } from '@hcengineering/activity'
import { settingId } from '@hcengineering/setting'
import telegram, { telegramId } from '@hcengineering/telegram'
import { attachmentId } from '@hcengineering/attachment'
import client, { clientId } from '@hcengineering/client'
import gmail, { gmailId } from '@hcengineering/gmail'
import { imageCropperId } from '@hcengineering/image-cropper'
import { templatesId } from '@hcengineering/templates'
import { notificationId } from '@hcengineering/notification'
import { calendarId } from '@hcengineering/calendar'
import { trackerId } from '@hcengineering/tracker'

import '@hcengineering/login-assets'
import '@hcengineering/task-assets'
import '@hcengineering/view-assets'
import '@hcengineering/chunter-assets'
import '@hcengineering/attachment-assets'
import '@hcengineering/contact-assets'
import '@hcengineering/activity-assets'
import '@hcengineering/setting-assets'
import '@hcengineering/telegram-assets'
import '@hcengineering/gmail-assets'
import '@hcengineering/workbench-assets'
import '@hcengineering/templates-assets'
import '@hcengineering/notification-assets'
import '@hcengineering/preference-assets'
import '@hcengineering/tracker-assets'
import presentation, { presentationId } from '@hcengineering/presentation'
import { coreId } from '@hcengineering/core'
import { textEditorId } from '@hcengineering/text-editor'

import { setMetadata } from '@hcengineering/platform'

export async function configurePlatform() {
  const config = await (await fetch('/config.json')).json()
  console.log('loading configuration', config)
  setMetadata(login.metadata.AccountsUrl, config.ACCOUNTS_URL)
  setMetadata(login.metadata.UploadUrl, config.UPLOAD_URL)

  if (config.MODEL_VERSION != null) {
    console.log('Minimal Model version requirement', config.MODEL_VERSION)
    setMetadata(presentation.metadata.RequiredVersion, config.MODEL_VERSION)
  }
  setMetadata(telegram.metadata.TelegramURL, process.env.TELEGRAM_URL ?? 'http://localhost:8086')
  setMetadata(gmail.metadata.GmailURL, process.env.GMAIL_URL ?? 'http://localhost:8087')
  setMetadata(login.metadata.OverrideEndpoint, process.env.LOGIN_ENDPOINT)

  setMetadata(uiPlugin.metadata.DefaultApplication, workbench.component.WorkbenchApp)
  setMetadata(workbench.metadata.ExcludedApplications, [contact.app.Contacts])

  setMetadata(
    uiPlugin.metadata.Routes,
    new Map([
      [workbenchId, workbench.component.WorkbenchApp],
      [loginId, login.component.LoginApp]
    ])
  )

  addLocation(coreId, async () => ({ default: async () => ({}) }))
  addLocation(presentationId, async () => ({ default: async () => ({}) }))
  addLocation(textEditorId, async () => ({ default: async () => ({}) }))

  addLocation(clientId, () => import(/* webpackChunkName: "client" */ '@hcengineering/client-resources'))
  addLocation(loginId, () => import(/* webpackChunkName: "login" */ '@hcengineering/login-resources'))
  addLocation(workbenchId, () => import(/* webpackChunkName: "workbench" */ '@hcengineering/workbench-resources'))
  addLocation(viewId, () => import(/* webpackChunkName: "view" */ '@hcengineering/view-resources'))
  addLocation(taskId, () => import(/* webpackChunkName: "task" */ '@hcengineering/task-resources'))
  addLocation(contactId, () => import(/* webpackChunkName: "contact" */ '@hcengineering/contact-resources'))
  addLocation(chunterId, () => import(/* webpackChunkName: "chunter" */ '@hcengineering/chunter-resources'))
  addLocation(activityId, () => import(/*webpackChunkName: "activity" */ '@hcengineering/activity-resources'))
  addLocation(settingId, () => import(/* webpackChunkName: "setting" */ '@hcengineering/setting-resources'))
  addLocation(telegramId, () => import(/* webpackChunkName: "telegram" */ '@hcengineering/telegram-resources'))
  addLocation(attachmentId, () => import(/* webpackChunkName: "attachment" */ '@hcengineering/attachment-resources'))
  addLocation(gmailId, () => import(/* webpackChunkName: "gmail" */ '@hcengineering/gmail-resources'))
  addLocation(imageCropperId, () => import(/* webpackChunkName: "image-cropper" */ '@hcengineering/image-cropper-resources'))
  addLocation(templatesId, () => import(/* webpackChunkName: "templates" */ '@hcengineering/templates-resources'))
  addLocation(notificationId, () => import(/* webpackChunkName: "notification" */ '@hcengineering/notification-resources'))
  addLocation(calendarId, () => import(/* webpackChunkName: "calendar" */ '@hcengineering/calendar-resources'))

  addLocation(trackerId, () => import(/* webpackChunkName: "tracker" */ '@hcengineering/tracker-resources'))
  setMetadata(workbench.metadata.PlatformTitle, 'Tracker')

  setMetadata(client.metadata.FilterModel, true)
  setMetadata(client.metadata.ExtraPlugins, ['preference' as Plugin])
}
