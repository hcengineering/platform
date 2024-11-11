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

import platform, { type Plugin, addLocation, addStringsLoader, platformId } from '@hcengineering/platform'

import { activityId } from '@hcengineering/activity'
import { attachmentId } from '@hcengineering/attachment'
import { boardId } from '@hcengineering/board'
import calendar, { calendarId } from '@hcengineering/calendar'
import { chunterId } from '@hcengineering/chunter'
import client, { clientId } from '@hcengineering/client'
import contactPlugin, { contactId } from '@hcengineering/contact'
import { documentId } from '@hcengineering/document'
import { driveId } from '@hcengineering/drive'
import gmail, { gmailId } from '@hcengineering/gmail'
import guest, { guestId } from '@hcengineering/guest'
import { hrId } from '@hcengineering/hr'
import { imageCropperId } from '@hcengineering/image-cropper'
import { inventoryId } from '@hcengineering/inventory'
import { leadId } from '@hcengineering/lead'
import login, { loginId } from '@hcengineering/login'
import notification, { notificationId } from '@hcengineering/notification'
import onboard, { onboardId } from '@hcengineering/onboard'
import { recruitId } from '@hcengineering/recruit'
import rekoni from '@hcengineering/rekoni'
import { requestId } from '@hcengineering/request'
import { settingId } from '@hcengineering/setting'
import { supportId } from '@hcengineering/support'
import { tagsId } from '@hcengineering/tags'
import { taskId } from '@hcengineering/task'
import telegram, { telegramId } from '@hcengineering/telegram'
import { templatesId } from '@hcengineering/templates'
import { timeId } from '@hcengineering/time'
import tracker, { trackerId } from '@hcengineering/tracker'
import uiPlugin from '@hcengineering/ui'
import { viewId } from '@hcengineering/view'
import workbench, { workbenchId } from '@hcengineering/workbench'
import love, { loveId } from '@hcengineering/love'
import print, { printId } from '@hcengineering/print'
import sign from '@hcengineering/sign'
import { desktopPreferencesId } from '@hcengineering/desktop-preferences'
import { diffviewId } from '@hcengineering/diffview'
import { productsId } from '@hcengineering/products'
import { questionsId } from '@hcengineering/questions'
import { trainingId } from '@hcengineering/training'
import { documentsId } from '@hcengineering/controlled-documents'
import textEditor, { textEditorId } from '@hcengineering/text-editor'
import analyticsCollector, {analyticsCollectorId} from '@hcengineering/analytics-collector'
import { uploaderId } from '@hcengineering/uploader'
import aiBot, { aiBotId } from '@hcengineering/ai-bot'

import { bitrixId } from '@hcengineering/bitrix'

import '@hcengineering/activity-assets'
import '@hcengineering/attachment-assets'
import '@hcengineering/bitrix-assets'
import '@hcengineering/board-assets'
import '@hcengineering/calendar-assets'
import '@hcengineering/chunter-assets'
import '@hcengineering/contact-assets'
import '@hcengineering/document-assets'
import '@hcengineering/drive-assets'
import '@hcengineering/gmail-assets'
import '@hcengineering/guest-assets'
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
import '@hcengineering/time-assets'
import '@hcengineering/tracker-assets'
import '@hcengineering/view-assets'
import '@hcengineering/workbench-assets'
import '@hcengineering/love-assets'
import '@hcengineering/print-assets'
import '@hcengineering/desktop-preferences-assets'
import '@hcengineering/diffview-assets'
import '@hcengineering/questions-assets'
import '@hcengineering/training-assets'
import '@hcengineering/products-assets'
import '@hcengineering/controlled-documents-assets'
import '@hcengineering/analytics-collector-assets'
import '@hcengineering/text-editor-assets'
import '@hcengineering/uploader-assets'

import github, { githubId } from '@hcengineering/github'
import '@hcengineering/github-assets'

import { coreId } from '@hcengineering/core'
import presentation, {
  loadServerConfig,
  parsePreviewConfig,
  parseUploadConfig,
  presentationId
} from '@hcengineering/presentation'

import { setMetadata } from '@hcengineering/platform'
import { setDefaultLanguage, initThemeStore } from '@hcengineering/theme'

import { preferenceId } from '@hcengineering/preference'
import { uiId } from '@hcengineering/ui/src/plugin'
import { configureAnalytics } from './analytics'
import { Analytics } from '@hcengineering/analytics'

export interface Config {
  ACCOUNTS_URL: string
  UPLOAD_URL: string
  FILES_URL: string
  MODEL_VERSION: string
  VERSION: string
  COLLABORATOR_URL: string
  COLLABORATOR?: string
  REKONI_URL: string
  TELEGRAM_URL: string
  GMAIL_URL: string
  CALENDAR_URL: string
  PUSH_PUBLIC_KEY: string
  APP_PROTOCOL?: string
  GITHUB_APP?: string
  GITHUB_CLIENTID?: string
  GITHUB_URL: string
  SENTRY_DSN?: string
  LOVE_ENDPOINT?: string
  LIVEKIT_WS?: string
  SIGN_URL?: string
  PRINT_URL?: string
  POSTHOG_API_KEY?: string
  POSTHOG_HOST?: string
  ANALYTICS_COLLECTOR_URL?:string
  BRANDING_URL?: string
  TELEGRAM_BOT_URL?: string
  AI_URL?:string
  DISABLE_SIGNUP?: string
  // Could be defined for dev environment
  FRONT_URL?: string
  PREVIEW_CONFIG?: string
  UPLOAD_CONFIG?: string
  STATS_URL?: string
}

export interface Branding {
  title?: string
  links?: {
    rel: string
    href: string
    type?: string
    sizes?: string
  }[]
  languages?: string
  lastNameFirst?: string
  defaultLanguage?: string
  defaultApplication?: string
  defaultSpace?: string
  defaultSpecial?: string
  initWorkspace?: string
}

export type BrandingMap = Record<string, Branding>

const devConfig = process.env.CLIENT_TYPE === 'dev-production'
const devConfigHuly = process.env.CLIENT_TYPE === 'dev-huly'
const devConfigBold = process.env.CLIENT_TYPE === 'dev-bold'

function configureI18n(): void {
   //Add localization
   addStringsLoader(platformId, async (lang: string) => await import(`@hcengineering/platform/lang/${lang}.json`))
   addStringsLoader(coreId, async (lang: string) => await import(`@hcengineering/core/lang/${lang}.json`))
   addStringsLoader(presentationId, async (lang: string) => await import(`@hcengineering/presentation/lang/${lang}.json`))
   addStringsLoader(textEditorId, async (lang: string) => await import(`@hcengineering/text-editor-assets/lang/${lang}.json`))
   addStringsLoader(uiId, async (lang: string) => await import(`@hcengineering/ui/lang/${lang}.json`))
   addStringsLoader(uploaderId, async (lang: string) => await import(`@hcengineering/uploader-assets/lang/${lang}.json`))
   addStringsLoader(activityId, async (lang: string) => await import(`@hcengineering/activity-assets/lang/${lang}.json`))
   addStringsLoader(attachmentId, async (lang: string) => await import(`@hcengineering/attachment-assets/lang/${lang}.json`))
   addStringsLoader(bitrixId, async (lang: string) => await import(`@hcengineering/bitrix-assets/lang/${lang}.json`))
   addStringsLoader(boardId, async (lang: string) => await import(`@hcengineering/board-assets/lang/${lang}.json`))
   addStringsLoader(calendarId, async (lang: string) => await import(`@hcengineering/calendar-assets/lang/${lang}.json`))
   addStringsLoader(chunterId, async (lang: string) => await import(`@hcengineering/chunter-assets/lang/${lang}.json`))
   addStringsLoader(contactId, async (lang: string) => await import(`@hcengineering/contact-assets/lang/${lang}.json`))
   addStringsLoader(driveId, async (lang: string) => await import(`@hcengineering/drive-assets/lang/${lang}.json`))
   addStringsLoader(gmailId, async (lang: string) => await import(`@hcengineering/gmail-assets/lang/${lang}.json`))
   addStringsLoader(hrId, async (lang: string) => await import(`@hcengineering/hr-assets/lang/${lang}.json`))
   addStringsLoader(inventoryId, async (lang: string) => await import(`@hcengineering/inventory-assets/lang/${lang}.json`))
   addStringsLoader(leadId, async (lang: string) => await import(`@hcengineering/lead-assets/lang/${lang}.json`))
   addStringsLoader(loginId, async (lang: string) => await import(`@hcengineering/login-assets/lang/${lang}.json`))
   addStringsLoader(notificationId, async (lang: string) => await import(`@hcengineering/notification-assets/lang/${lang}.json`))
   addStringsLoader(onboardId, async (lang: string) => await import(`@hcengineering/onboard-assets/lang/${lang}.json`))
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

   addStringsLoader(desktopPreferencesId, async (lang: string) => await import(`@hcengineering/desktop-preferences-assets/lang/${lang}.json`))
   addStringsLoader(diffviewId, async (lang: string) => await import(`@hcengineering/diffview-assets/lang/${lang}.json`))
   addStringsLoader(documentId, async (lang: string) => await import(`@hcengineering/document-assets/lang/${lang}.json`))
   addStringsLoader(timeId, async (lang: string) => await import(`@hcengineering/time-assets/lang/${lang}.json`))
   addStringsLoader(githubId, async (lang: string) => await import(`@hcengineering/github-assets/lang/${lang}.json`))
   addStringsLoader(documentsId, async (lang: string) => await import(`@hcengineering/controlled-documents-assets/lang/${lang}.json`))
   addStringsLoader(productsId, async (lang: string) => await import(`@hcengineering/products-assets/lang/${lang}.json`))
   addStringsLoader(questionsId, async (lang: string) => await import(`@hcengineering/questions-assets/lang/${lang}.json`))
   addStringsLoader(trainingId, async (lang: string) => await import(`@hcengineering/training-assets/lang/${lang}.json`))
   addStringsLoader(guestId, async (lang: string) => await import(`@hcengineering/guest-assets/lang/${lang}.json`))
   addStringsLoader(loveId, async (lang: string) => await import(`@hcengineering/love-assets/lang/${lang}.json`))
   addStringsLoader(printId, async (lang: string) => await import(`@hcengineering/print-assets/lang/${lang}.json`))
   addStringsLoader(analyticsCollectorId, async (lang: string) => await import(`@hcengineering/analytics-collector-assets/lang/${lang}.json`))
}

export async function configurePlatform() {
  setMetadata(platform.metadata.LoadHelper, async (loader) => {
    for (let i = 0; i < 5; i++) {
      try {
        return loader()
      } catch (err: any) {
        if (err.message.includes('Loading chunk') && i != 4) {
          continue
        }
        Analytics.handleError(err)
        location.reload()
      }
    }
  })
  configureI18n()

  const config: Config = await loadServerConfig(
    devConfigHuly
      ? '/config-huly.json' : (
        devConfigBold ? '/config-bold.json' : ( 
          devConfig ? '/config-dev.json' : '/config.json'))
  )
  const branding: BrandingMap = config.BRANDING_URL !== undefined ? await (await fetch(config.BRANDING_URL)).json() : {}
  const myBranding = branding[window.location.host] ?? {}

  console.log('loading configuration', config)
  console.log('loaded branding', myBranding)

  const title = myBranding.title ?? 'Platform'

  // apply branding
  window.document.title = title

  const links = myBranding.links ?? []
  if (links.length > 0) {
    // remove the default favicon
    // it's only needed for Safari which cannot use dynamically added links for favicons
    document.getElementById('default-favicon')?.remove()

    for (const link of links) {
      const htmlLink = document.createElement('link')
      htmlLink.rel = link.rel
      htmlLink.href = link.href

      if (link.type !== undefined) {
        htmlLink.type = link.type
      }

      if (link.sizes !== undefined) {
        htmlLink.setAttribute('sizes', link.sizes)
      }

      document.head.appendChild(htmlLink)
    }
  }

  configureAnalytics(config)
  // tryOpenInDesktopApp(config.APP_PROTOCOL ?? 'huly://')

  setMetadata(login.metadata.AccountsUrl, config.ACCOUNTS_URL)
  setMetadata(login.metadata.DisableSignUp, config.DISABLE_SIGNUP === 'true')
  setMetadata(presentation.metadata.FilesURL, config.FILES_URL)
  setMetadata(presentation.metadata.UploadURL, config.UPLOAD_URL)
  setMetadata(presentation.metadata.CollaboratorUrl, config.COLLABORATOR_URL)

  setMetadata(presentation.metadata.FrontUrl, config.FRONT_URL)
  setMetadata(presentation.metadata.PreviewConfig, parsePreviewConfig(config.PREVIEW_CONFIG))
  setMetadata(presentation.metadata.UploadConfig, parseUploadConfig(config.UPLOAD_CONFIG, config.UPLOAD_URL))
  setMetadata(presentation.metadata.StatsUrl, config.STATS_URL)

  setMetadata(textEditor.metadata.Collaborator, config.COLLABORATOR)

  if (config.MODEL_VERSION != null) {
    console.log('Minimal Model version requirement', config.MODEL_VERSION)
    setMetadata(presentation.metadata.ModelVersion, config.MODEL_VERSION)
  }
  if (config.VERSION != null) {
    console.log('Minimal version requirement', config.VERSION)
    setMetadata(presentation.metadata.FrontVersion, config.VERSION)
  }
  setMetadata(telegram.metadata.TelegramURL, config.TELEGRAM_URL ?? 'http://localhost:8086')
  setMetadata(telegram.metadata.BotUrl, config.TELEGRAM_BOT_URL)
  setMetadata(gmail.metadata.GmailURL, config.GMAIL_URL ?? 'http://localhost:8087')
  setMetadata(calendar.metadata.CalendarServiceURL, config.CALENDAR_URL ?? 'http://localhost:8095')
  setMetadata(notification.metadata.PushPublicKey, config.PUSH_PUBLIC_KEY)
  setMetadata(analyticsCollector.metadata.EndpointURL, config.ANALYTICS_COLLECTOR_URL)
  setMetadata(aiBot.metadata.EndpointURL, config.AI_URL)

  setMetadata(github.metadata.GithubApplication, config.GITHUB_APP ?? '')
  setMetadata(github.metadata.GithubClientID, config.GITHUB_CLIENTID ?? '')
  setMetadata(github.metadata.GithubURL, config.GITHUB_URL)

  setMetadata(rekoni.metadata.RekoniUrl, config.REKONI_URL)

  setMetadata(uiPlugin.metadata.DefaultApplication, login.component.LoginApp)
  setMetadata(contactPlugin.metadata.LastNameFirst, myBranding.lastNameFirst === 'true' ?? false)
  setMetadata(love.metadata.ServiceEnpdoint, config.LOVE_ENDPOINT)
  setMetadata(love.metadata.WebSocketURL, config.LIVEKIT_WS)
  setMetadata(print.metadata.PrintURL, config.PRINT_URL)
  setMetadata(sign.metadata.SignURL, config.SIGN_URL)

  const languages = myBranding.languages ? (myBranding.languages as string).split(',').map((l) => l.trim()) : ['en', 'ru', 'es', 'pt', 'zh']

  setMetadata(uiPlugin.metadata.Languages, languages)

  setMetadata(
    uiPlugin.metadata.Routes,
    new Map([
      [workbenchId, workbench.component.WorkbenchApp],
      [loginId, login.component.LoginApp],
      [onboardId, onboard.component.OnboardApp],
      [githubId, github.component.ConnectApp],
      [calendarId, calendar.component.ConnectApp],
      [guestId, guest.component.GuestApp]
    ])
  )

  addLocation(coreId, async () => ({ default: async () => ({}) }))
  addLocation(presentationId, async () => ({ default: async () => ({}) }))

  addLocation(clientId, () => import(/* webpackChunkName: "client" */ '@hcengineering/client-resources'))
  addLocation(loginId, () => import(/* webpackChunkName: "login" */ '@hcengineering/login-resources'))
  addLocation(onboardId, () => import(/* webpackChunkName: "onboard" */ '@hcengineering/onboard-resources'))
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
  addLocation(diffviewId, () => import(/* webpackChunkName: "diffview" */ '@hcengineering/diffview-resources'))
  addLocation(timeId, () => import(/* webpackChunkName: "time" */ '@hcengineering/time-resources'))
  addLocation(desktopPreferencesId, () => import(/* webpackChunkName: "desktop-preferences" */ '@hcengineering/desktop-preferences-resources'))
  addLocation(analyticsCollectorId, async () => await import('@hcengineering/analytics-collector-resources'))
  addLocation(aiBotId, async () => await import('@hcengineering/ai-bot-resources'))

  addLocation(trackerId, () => import(/* webpackChunkName: "tracker" */ '@hcengineering/tracker-resources'))
  addLocation(boardId, () => import(/* webpackChunkName: "board" */ '@hcengineering/board-resources'))
  addLocation(hrId, () => import(/* webpackChunkName: "hr" */ '@hcengineering/hr-resources'))
  addLocation(bitrixId, () => import(/* webpackChunkName: "bitrix" */ '@hcengineering/bitrix-resources'))
  addLocation(requestId, () => import(/* webpackChunkName: "request" */ '@hcengineering/request-resources'))
  addLocation(driveId, () => import(/* webpackChunkName: "drive" */ '@hcengineering/drive-resources'))
  addLocation(supportId, () => import(/* webpackChunkName: "support" */ '@hcengineering/support-resources'))

  addLocation(documentId, () => import(/* webpackChunkName: "document" */ '@hcengineering/document-resources'))
  addLocation(githubId, () => import(/* webpackChunkName: "github" */ '@hcengineering/github-resources'))
  addLocation(questionsId, () => import(/* webpackChunkName: "training" */ '@hcengineering/questions-resources'))
  addLocation(trainingId, () => import(/* webpackChunkName: "training" */ '@hcengineering/training-resources'))
  addLocation(productsId, () => import(/* webpackChunkName: "products" */ '@hcengineering/products-resources'))
  addLocation(documentsId, () => import(/* webpackChunkName: "documents" */ '@hcengineering/controlled-documents-resources'))
  addLocation(guestId, () => import(/* webpackChunkName: "guest" */ '@hcengineering/guest-resources'))
  addLocation(loveId, () => import(/* webpackChunkName: "love" */ '@hcengineering/love-resources'))
  addLocation(printId, () => import(/* webpackChunkName: "print" */ '@hcengineering/print-resources'))
  addLocation(textEditorId, () => import(/* webpackChunkName: "text-editor" */ '@hcengineering/text-editor-resources'))
  addLocation(uploaderId, () => import(/* webpackChunkName: "uploader" */ '@hcengineering/uploader-resources'))

  setMetadata(client.metadata.FilterModel, 'ui')
  setMetadata(client.metadata.ExtraPlugins, ['preference' as Plugin])

  // Use binary response transfer for faster performance and small transfer sizes.
  setMetadata(client.metadata.UseBinaryProtocol, true)
  // Disable for now, since it causes performance issues on linux/docker/kubernetes boxes for now.
  setMetadata(client.metadata.UseProtocolCompression, true)

  setMetadata(uiPlugin.metadata.PlatformTitle, title)
  setMetadata(workbench.metadata.PlatformTitle, title)
  setDefaultLanguage(myBranding.defaultLanguage ?? 'en')
  setMetadata(workbench.metadata.DefaultApplication, myBranding.defaultApplication ?? 'tracker')
  setMetadata(workbench.metadata.DefaultSpace, myBranding.defaultSpace ?? tracker.project.DefaultProject)
  setMetadata(workbench.metadata.DefaultSpecial, myBranding.defaultSpecial ?? 'issues')

  initThemeStore()
}
