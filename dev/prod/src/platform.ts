//
// Copyright © 2022, 2023 Hardcore Engineering Inc.
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

import { Plugin, addLocation, addStringsLoader, platformId } from '@hcengineering/platform'

import { activityId } from '@hcengineering/activity'
import { attachmentId } from '@hcengineering/attachment'
import { boardId } from '@hcengineering/board'
import calendar, { calendarId } from '@hcengineering/calendar'
import { chunterId } from '@hcengineering/chunter'
import client, { clientId } from '@hcengineering/client'
import { contactId } from '@hcengineering/contact'
import gmail, { gmailId } from '@hcengineering/gmail'
import { hrId } from '@hcengineering/hr'
import { imageCropperId } from '@hcengineering/image-cropper'
import { inventoryId } from '@hcengineering/inventory'
import { leadId } from '@hcengineering/lead'
import login, { loginId } from '@hcengineering/login'
import { notificationId } from '@hcengineering/notification'
import { recruitId } from '@hcengineering/recruit'
import rekoni from '@hcengineering/rekoni'
import { requestId } from '@hcengineering/request'
import { settingId } from '@hcengineering/setting'
import { supportId } from '@hcengineering/support'
import { tagsId } from '@hcengineering/tags'
import { taskId } from '@hcengineering/task'
import telegram, { telegramId } from '@hcengineering/telegram'
import { templatesId } from '@hcengineering/templates'
import tracker, { trackerId } from '@hcengineering/tracker'
import uiPlugin from '@hcengineering/ui'
import { viewId } from '@hcengineering/view'
import workbench, { workbenchId } from '@hcengineering/workbench'

import { bitrixId } from '@hcengineering/bitrix'

import '@hcengineering/activity-assets'
import '@hcengineering/attachment-assets'
import '@hcengineering/bitrix-assets'
import '@hcengineering/board-assets'
import '@hcengineering/calendar-assets'
import '@hcengineering/chunter-assets'
import '@hcengineering/contact-assets'
import '@hcengineering/gmail-assets'
import '@hcengineering/hr-assets'
import '@hcengineering/inventory-assets'
import '@hcengineering/lead-assets'
import '@hcengineering/login-assets'
import '@hcengineering/notification-assets'
import '@hcengineering/preference-assets'
import '@hcengineering/recruit-assets'
import '@hcengineering/request-assets'
import '@hcengineering/setting-assets'
import '@hcengineering/support-assets'
import '@hcengineering/tags-assets'
import '@hcengineering/task-assets'
import '@hcengineering/telegram-assets'
import '@hcengineering/templates-assets'
import '@hcengineering/tracker-assets'
import '@hcengineering/view-assets'
import '@hcengineering/workbench-assets'

import { coreId } from '@hcengineering/core'
import presentation, { presentationId } from '@hcengineering/presentation'
import { textEditorId } from '@hcengineering/text-editor'

import { setMetadata } from '@hcengineering/platform'
import { setDefaultLanguage } from '@hcengineering/theme'
import { uiId } from '@hcengineering/ui/src/plugin'
import { preferenceId } from '@hcengineering/preference'

interface Config {
  ACCOUNTS_URL: string
  UPLOAD_URL: string
  MODEL_VERSION: string
  REKONI_URL: string
  TELEGRAM_URL: string
  GMAIL_URL: string
  CALENDAR_URL: string
  TITLE?: string
  LANGUAGES?: string
  DEFAULT_LANGUAGE?: string
}

const devConfig = process.env.CLIENT_TYPE === 'dev-production'

function configureI18n(): void {
   //Add localization
   addStringsLoader(coreId, async (lang: string) => await import(`@hcengineering/core/lang/${lang}.json`))
   addStringsLoader(platformId, async (lang: string) => await import(`@hcengineering/platform/lang/${lang}.json`))
   addStringsLoader(presentationId, async (lang: string) => await import(`@hcengineering/presentation/lang/${lang}.json`))
   addStringsLoader(textEditorId, async (lang: string) => await import(`@hcengineering/text-editor/lang/${lang}.json`))
   addStringsLoader(uiId, async (lang: string) => await import(`@hcengineering/ui/lang/${lang}.json`))
   addStringsLoader(activityId, async (lang: string) => await import(`@hcengineering/activity-assets/lang/${lang}.json`))
   addStringsLoader(attachmentId, async (lang: string) => await import(`@hcengineering/attachment-assets/lang/${lang}.json`))
   addStringsLoader(bitrixId, async (lang: string) => await import(`@hcengineering/bitrix-assets/lang/${lang}.json`))
   addStringsLoader(boardId, async (lang: string) => await import(`@hcengineering/board-assets/lang/${lang}.json`))
   addStringsLoader(calendarId, async (lang: string) => await import(`@hcengineering/calendar-assets/lang/${lang}.json`))
   addStringsLoader(chunterId, async (lang: string) => await import(`@hcengineering/chunter-assets/lang/${lang}.json`))
   addStringsLoader(contactId, async (lang: string) => await import(`@hcengineering/contact-assets/lang/${lang}.json`))
   addStringsLoader(gmailId, async (lang: string) => await import(`@hcengineering/gmail-assets/lang/${lang}.json`))
   addStringsLoader(hrId, async (lang: string) => await import(`@hcengineering/hr-assets/lang/${lang}.json`))
   addStringsLoader(inventoryId, async (lang: string) => await import(`@hcengineering/inventory-assets/lang/${lang}.json`))
   addStringsLoader(leadId, async (lang: string) => await import(`@hcengineering/lead-assets/lang/${lang}.json`))
   addStringsLoader(loginId, async (lang: string) => await import(`@hcengineering/login-assets/lang/${lang}.json`))
   addStringsLoader(notificationId, async (lang: string) => await import(`@hcengineering/notification-assets/lang/${lang}.json`))
   addStringsLoader(preferenceId, async (lang: string) => await import(`@hcengineering/preference-assets/lang/${lang}.json`))
   addStringsLoader(recruitId, async (lang: string) => await import(`@hcengineering/recruit-assets/lang/${lang}.json`))
   addStringsLoader(requestId, async (lang: string) => await import(`@hcengineering/request-assets/lang/${lang}.json`))
   addStringsLoader(settingId, async (lang: string) => await import(`@hcengineering/setting-assets/lang/${lang}.json`))
   addStringsLoader(supportId, async (lang: string) => await import(`@hcengineering/support-assets/lang/${lang}.json`))
   addStringsLoader(tagsId, async (lang: string) => await import(`@hcengineering/tags-assets/lang/${lang}.json`))
   addStringsLoader(taskId, async (lang: string) => await import(`@hcengineering/task-assets/lang/${lang}.json`))
   addStringsLoader(telegramId, async (lang: string) => await import(`@hcengineering/telegram-assets/lang/${lang}.json`))
   addStringsLoader(templatesId, async (lang: string) => await import(`@hcengineering/templates-assets/lang/${lang}.json`))
   addStringsLoader(trackerId, async (lang: string) => await import(`@hcengineering/tracker-assets/lang/${lang}.json`))
   addStringsLoader(viewId, async (lang: string) => await import(`@hcengineering/view-assets/lang/${lang}.json`))
   addStringsLoader(workbenchId, async (lang: string) => await import(`@hcengineering/workbench-assets/lang/${lang}.json`))
}

export async function configurePlatform() {
  configureI18n()
  
  const config: Config = await (await fetch(devConfig? '/config-dev.json' : '/config.json')).json()
  console.log('loading configuration', config)
  setMetadata(login.metadata.AccountsUrl, config.ACCOUNTS_URL)
  setMetadata(presentation.metadata.UploadURL, config.UPLOAD_URL)
  
  if (config.MODEL_VERSION != null) {
    console.log('Minimal Model version requirement', config.MODEL_VERSION)
    setMetadata(presentation.metadata.RequiredVersion, config.MODEL_VERSION)
  }
  setMetadata(telegram.metadata.TelegramURL, config.TELEGRAM_URL ?? 'http://localhost:8086')
  setMetadata(gmail.metadata.GmailURL, config.GMAIL_URL ?? 'http://localhost:8087')
  setMetadata(calendar.metadata.CalendarServiceURL, config.CALENDAR_URL ?? 'http://localhost:8095')
  
  setMetadata(login.metadata.OverrideEndpoint, process.env.LOGIN_ENDPOINT)

  setMetadata(rekoni.metadata.RekoniUrl, config.REKONI_URL)

  setMetadata(uiPlugin.metadata.DefaultApplication, login.component.LoginApp)

  const languages = config.LANGUAGES ? (config.LANGUAGES as string).split(',').map((l) => l.trim()) : ['en', 'ru']

  setMetadata(uiPlugin.metadata.Languages, languages)
  setMetadata(
    uiPlugin.metadata.Routes,
    new Map([
      [workbenchId, workbench.component.WorkbenchApp],
      [loginId, login.component.LoginApp],
      [calendarId, calendar.component.ConnectApp]
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
  addLocation(recruitId, () => import(/* webpackChunkName: "recruit" */ '@hcengineering/recruit-resources'))
  addLocation(activityId, () => import(/*webpackChunkName: "activity" */ '@hcengineering/activity-resources'))
  addLocation(settingId, () => import(/* webpackChunkName: "setting" */ '@hcengineering/setting-resources'))
  addLocation(leadId, () => import(/* webpackChunkName: "lead" */ '@hcengineering/lead-resources'))
  addLocation(telegramId, () => import(/* webpackChunkName: "telegram" */ '@hcengineering/telegram-resources'))
  addLocation(attachmentId, () => import(/* webpackChunkName: "attachment" */ '@hcengineering/attachment-resources'))
  addLocation(gmailId, () => import(/* webpackChunkName: "gmail" */ '@hcengineering/gmail-resources'))
  addLocation(imageCropperId, () => import(/* webpackChunkName: "image-cropper" */ '@hcengineering/image-cropper-resources'))
  addLocation(inventoryId, () => import(/* webpackChunkName: "inventory" */ '@hcengineering/inventory-resources'))
  addLocation(templatesId, () => import(/* webpackChunkName: "templates" */ '@hcengineering/templates-resources'))
  addLocation(notificationId, () => import(/* webpackChunkName: "notification" */ '@hcengineering/notification-resources'))
  addLocation(tagsId, () => import(/* webpackChunkName: "tags" */ '@hcengineering/tags-resources'))
  addLocation(calendarId, () => import(/* webpackChunkName: "calendar" */ '@hcengineering/calendar-resources'))

  addLocation(trackerId, () => import(/* webpackChunkName: "tracker" */ '@hcengineering/tracker-resources'))
  addLocation(boardId, () => import(/* webpackChunkName: "board" */ '@hcengineering/board-resources'))
  addLocation(hrId, () => import(/* webpackChunkName: "hr" */ '@hcengineering/hr-resources'))
  addLocation(bitrixId, () => import(/* webpackChunkName: "bitrix" */ '@hcengineering/bitrix-resources'))
  addLocation(requestId, () => import(/* webpackChunkName: "request" */ '@hcengineering/request-resources'))
  addLocation(supportId, () => import(/* webpackChunkName: "support" */ '@hcengineering/support-resources'))

  setMetadata(client.metadata.FilterModel, true)
  setMetadata(client.metadata.ExtraPlugins, ['preference' as Plugin])

  // Use binary response transfer for faster performance and small transfer sizes.
  setMetadata(client.metadata.UseBinaryProtocol, true)
  // Disable for now, since it causes performance issues on linux/docker/kubernetes boxes for now.
  setMetadata(client.metadata.UseProtocolCompression, true)

  setMetadata(workbench.metadata.PlatformTitle, config.TITLE ?? 'Platform')
  setDefaultLanguage(config.DEFAULT_LANGUAGE ?? 'en')
  setMetadata(workbench.metadata.DefaultApplication, 'tracker')
  setMetadata(workbench.metadata.DefaultSpace, tracker.project.DefaultProject)
  setMetadata(workbench.metadata.DefaultSpecial, 'issues')
}
