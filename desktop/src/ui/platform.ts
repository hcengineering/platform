//
// Copyright © 2023 Hardcore Engineering Inc.
//

import {
  Plugin,
  addEventListener,
  addLocation,
  addStringsLoader,
  getMetadata,
  platformId,
  setMetadata
} from '@hcengineering/platform'

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
import tracker, { trackerId } from '@hcengineering/tracker'
import uiPlugin, { getCurrentLocation, locationStorageKeyId, locationToUrl, navigate, parseLocation, setLocationStorageKey } from '@hcengineering/ui'
import { uploaderId } from '@hcengineering/uploader'
import { viewId } from '@hcengineering/view'
import workbench, { workbenchId } from '@hcengineering/workbench'
import { diffviewId } from '@hcengineering/diffview'
import { timeId } from '@hcengineering/time'
import { desktopPreferencesId } from '@hcengineering/desktop-preferences'
import guest, { guestId } from '@hcengineering/guest'
import { bitrixId } from '@hcengineering/bitrix'
import { productsId } from '@hcengineering/products'
import { questionsId } from '@hcengineering/questions'
import { trainingId } from '@hcengineering/training'
import { documentsId } from '@hcengineering/controlled-documents'
import aiBot, { aiBotId } from '@hcengineering/ai-bot'
import { testManagementId } from '@hcengineering/test-management'
import { surveyId } from '@hcengineering/survey'

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
import '@hcengineering/guest-assets'
import '@hcengineering/uploader-assets'
import '@hcengineering/diffview-assets'
import '@hcengineering/time-assets'
import '@hcengineering/desktop-preferences-assets'
import '@hcengineering/love-assets'
import '@hcengineering/print-assets'
import '@hcengineering/questions-assets'
import '@hcengineering/training-assets'
import '@hcengineering/products-assets'
import '@hcengineering/controlled-documents-assets'
import '@hcengineering/analytics-collector-assets'
import '@hcengineering/text-editor-assets'
import '@hcengineering/test-management-assets'
import '@hcengineering/survey-assets'

import { coreId } from '@hcengineering/core'
import presentation, { parsePreviewConfig, parseUploadConfig, presentationId } from '@hcengineering/presentation'
import textEditor, { textEditorId } from '@hcengineering/text-editor'
import love, { loveId } from '@hcengineering/love'
import print, { printId } from '@hcengineering/print'
import sign from '@hcengineering/sign'
import analyticsCollector, { analyticsCollectorId } from '@hcengineering/analytics-collector'

import { setDefaultLanguage, initThemeStore } from '@hcengineering/theme'
import { configureNotifications } from './notifications'
import { Config, IPCMainExposed, Branding } from './types'

import '@hcengineering/github-assets'
import github, { githubId } from '@hcengineering/github'
import { uiId } from '@hcengineering/ui/src/plugin'
import { preferenceId } from '@hcengineering/preference'

function configureI18n(): void {
  // Add localization
  addStringsLoader(platformId, async (lang: string) => await import(`@hcengineering/platform/lang/${lang}.json`))
  addStringsLoader(coreId, async (lang: string) => await import(`@hcengineering/core/lang/${lang}.json`))
  addStringsLoader(
    presentationId,
    async (lang: string) => await import(`@hcengineering/presentation/lang/${lang}.json`)
  )
  addStringsLoader(textEditorId, async (lang: string) => await import(`@hcengineering/text-editor-assets/lang/${lang}.json`))
  addStringsLoader(uiId, async (lang: string) => await import(`@hcengineering/ui/lang/${lang}.json`))
  addStringsLoader(uploaderId, async (lang: string) => await import(`@hcengineering/uploader-assets/lang/${lang}.json`))
  addStringsLoader(activityId, async (lang: string) => await import(`@hcengineering/activity-assets/lang/${lang}.json`))
  addStringsLoader(
    attachmentId,
    async (lang: string) => await import(`@hcengineering/attachment-assets/lang/${lang}.json`)
  )
  addStringsLoader(bitrixId, async (lang: string) => await import(`@hcengineering/bitrix-assets/lang/${lang}.json`))
  addStringsLoader(boardId, async (lang: string) => await import(`@hcengineering/board-assets/lang/${lang}.json`))
  addStringsLoader(calendarId, async (lang: string) => await import(`@hcengineering/calendar-assets/lang/${lang}.json`))
  addStringsLoader(chunterId, async (lang: string) => await import(`@hcengineering/chunter-assets/lang/${lang}.json`))
  addStringsLoader(contactId, async (lang: string) => await import(`@hcengineering/contact-assets/lang/${lang}.json`))
  addStringsLoader(driveId, async (lang: string) => await import(`@hcengineering/drive-assets/lang/${lang}.json`))
  addStringsLoader(gmailId, async (lang: string) => await import(`@hcengineering/gmail-assets/lang/${lang}.json`))
  addStringsLoader(hrId, async (lang: string) => await import(`@hcengineering/hr-assets/lang/${lang}.json`))
  addStringsLoader(
    inventoryId,
    async (lang: string) => await import(`@hcengineering/inventory-assets/lang/${lang}.json`)
  )
  addStringsLoader(leadId, async (lang: string) => await import(`@hcengineering/lead-assets/lang/${lang}.json`))
  addStringsLoader(loginId, async (lang: string) => await import(`@hcengineering/login-assets/lang/${lang}.json`))
  addStringsLoader(
    notificationId,
    async (lang: string) => await import(`@hcengineering/notification-assets/lang/${lang}.json`)
  )
  addStringsLoader(onboardId, async (lang: string) => await import(`@hcengineering/onboard-assets/lang/${lang}.json`))
  addStringsLoader(
    preferenceId,
    async (lang: string) => await import(`@hcengineering/preference-assets/lang/${lang}.json`)
  )
  addStringsLoader(recruitId, async (lang: string) => await import(`@hcengineering/recruit-assets/lang/${lang}.json`))
  addStringsLoader(requestId, async (lang: string) => await import(`@hcengineering/request-assets/lang/${lang}.json`))
  addStringsLoader(settingId, async (lang: string) => await import(`@hcengineering/setting-assets/lang/${lang}.json`))
  addStringsLoader(supportId, async (lang: string) => await import(`@hcengineering/support-assets/lang/${lang}.json`))
  addStringsLoader(tagsId, async (lang: string) => await import(`@hcengineering/tags-assets/lang/${lang}.json`))
  addStringsLoader(taskId, async (lang: string) => await import(`@hcengineering/task-assets/lang/${lang}.json`))
  addStringsLoader(telegramId, async (lang: string) => await import(`@hcengineering/telegram-assets/lang/${lang}.json`))
  addStringsLoader(
    templatesId,
    async (lang: string) => await import(`@hcengineering/templates-assets/lang/${lang}.json`)
  )
  addStringsLoader(trackerId, async (lang: string) => await import(`@hcengineering/tracker-assets/lang/${lang}.json`))
  addStringsLoader(viewId, async (lang: string) => await import(`@hcengineering/view-assets/lang/${lang}.json`))
  addStringsLoader(
    workbenchId,
    async (lang: string) => await import(`@hcengineering/workbench-assets/lang/${lang}.json`)
  )

  addStringsLoader(
    desktopPreferencesId,
    async (lang: string) => await import(`@hcengineering/desktop-preferences-assets/lang/${lang}.json`)
  )
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
  addStringsLoader(testManagementId, async (lang: string) => await import(`@hcengineering/test-management-assets/lang/${lang}.json`))
  addStringsLoader(surveyId, async (lang: string) => await import(`@hcengineering/survey-assets/lang/${lang}.json`))
}

export async function configurePlatform(): Promise<void> {
  configureI18n()

  const ipcMain = (window as any).electron as IPCMainExposed
  const config: Config = await ipcMain.config()
  const myBranding: Branding = await ipcMain.branding()
  // await (await fetch(devConfig? '/config-dev.json' : '/config.json')).json()
  console.log('loading configuration', config)
  console.log('loaded branding', myBranding)

  const title = myBranding.title ?? 'Huly Desktop'
  ipcMain.setTitle(title)

  setMetadata(login.metadata.AccountsUrl, config.ACCOUNTS_URL)
  setMetadata(login.metadata.DisableSignUp, config.DISABLE_SIGNUP === 'true')
  setMetadata(login.metadata.DefaultLoginMethod, config.DEFAULT_LOGIN_METHOD)
  setMetadata(presentation.metadata.UploadURL, config.UPLOAD_URL)
  setMetadata(presentation.metadata.FilesURL, config.FILES_URL)
  setMetadata(presentation.metadata.CollaboratorUrl, config.COLLABORATOR_URL)
  setMetadata(presentation.metadata.PreviewConfig, parsePreviewConfig(config.PREVIEW_CONFIG))
  setMetadata(presentation.metadata.UploadConfig, parseUploadConfig(config.UPLOAD_CONFIG, config.UPLOAD_URL))
  setMetadata(presentation.metadata.FrontUrl, config.FRONT_URL)
  setMetadata(presentation.metadata.StatsUrl, config.STATS_URL)

  setMetadata(textEditor.metadata.Collaborator, config.COLLABORATOR ?? '')

  setMetadata(github.metadata.GithubApplication, config.GITHUB_APP ?? '')
  setMetadata(github.metadata.GithubClientID, config.GITHUB_CLIENTID ?? '')
  setMetadata(github.metadata.GithubURL, config.GITHUB_URL ?? '')

  if (config.MODEL_VERSION != null) {
    console.log('Minimal Model version requirement', config.MODEL_VERSION)
    setMetadata(presentation.metadata.ModelVersion, config.MODEL_VERSION)
  }
  if (config.VERSION != null) {
    console.log('Minimal version requirement', config.VERSION)
    setMetadata(presentation.metadata.FrontVersion, config.VERSION)
  }
  setMetadata(telegram.metadata.TelegramURL, config.TELEGRAM_URL ?? 'http://localhost:8086')
  setMetadata(telegram.metadata.BotUrl, config.TELEGRAM_BOT_URL ?? 'http://localhost:4020')
  setMetadata(gmail.metadata.GmailURL, config.GMAIL_URL ?? 'http://localhost:8087')
  setMetadata(calendar.metadata.CalendarServiceURL, config.CALENDAR_URL ?? 'http://localhost:8095')
  setMetadata(notification.metadata.PushPublicKey, config.PUSH_PUBLIC_KEY)

  setMetadata(rekoni.metadata.RekoniUrl, config.REKONI_URL)
  setMetadata(contactPlugin.metadata.LastNameFirst, myBranding.lastNameFirst === 'true' ?? false)
  setMetadata(love.metadata.ServiceEnpdoint, config.LOVE_ENDPOINT)
  setMetadata(love.metadata.WebSocketURL, config.LIVEKIT_WS)
  setMetadata(print.metadata.PrintURL, config.PRINT_URL)
  setMetadata(sign.metadata.SignURL, config.SIGN_URL)
  setMetadata(uiPlugin.metadata.DefaultApplication, login.component.LoginApp)
  setMetadata(analyticsCollector.metadata.EndpointURL, config.ANALYTICS_COLLECTOR_URL)
  setMetadata(aiBot.metadata.EndpointURL, config.AI_URL)

  const languages = myBranding.languages !== undefined && myBranding.languages !== '' ? myBranding.languages.split(',').map((l) => l.trim()) : ['en', 'ru', 'es', 'pt']

  setMetadata(uiPlugin.metadata.Languages, languages)

  setMetadata(
    uiPlugin.metadata.Routes,
    new Map([
      [workbenchId, workbench.component.WorkbenchApp],
      [loginId, login.component.LoginApp],
      [onboardId, onboard.component.OnboardApp],
      [calendarId, calendar.component.ConnectApp],
      [guestId, guest.component.GuestApp]
    ])
  )

  addLocation(coreId, async () => ({ default: async () => ({}) }))
  addLocation(presentationId, async () => ({ default: async () => ({}) }))

  addLocation(clientId, async () => await import('@hcengineering/client-resources'))
  addLocation(loginId, async () => await import('@hcengineering/login-resources'))
  addLocation(onboardId, async () => await import('@hcengineering/onboard-resources'))
  addLocation(workbenchId, async () => await import('@hcengineering/workbench-resources'))
  addLocation(viewId, async () => await import('@hcengineering/view-resources'))
  addLocation(taskId, async () => await import('@hcengineering/task-resources'))
  addLocation(contactId, async () => await import('@hcengineering/contact-resources'))
  addLocation(chunterId, async () => await import('@hcengineering/chunter-resources'))
  addLocation(recruitId, async () => await import('@hcengineering/recruit-resources'))
  addLocation(activityId, async () => await import('@hcengineering/activity-resources'))
  addLocation(settingId, async () => await import('@hcengineering/setting-resources'))
  addLocation(leadId, async () => await import('@hcengineering/lead-resources'))
  addLocation(telegramId, async () => await import('@hcengineering/telegram-resources'))
  addLocation(attachmentId, async () => await import('@hcengineering/attachment-resources'))
  addLocation(gmailId, async () => await import('@hcengineering/gmail-resources'))
  addLocation(imageCropperId, async () => await import('@hcengineering/image-cropper-resources'))
  addLocation(inventoryId, async () => await import('@hcengineering/inventory-resources'))
  addLocation(templatesId, async () => await import('@hcengineering/templates-resources'))
  addLocation(notificationId, async () => await import('@hcengineering/notification-resources'))
  addLocation(tagsId, async () => await import('@hcengineering/tags-resources'))
  addLocation(calendarId, async () => await import('@hcengineering/calendar-resources'))
  addLocation(analyticsCollectorId, async () => await import('@hcengineering/analytics-collector-resources'))
  addLocation(aiBotId, async () => await import('@hcengineering/ai-bot-resources'))

  addLocation(trackerId, async () => await import('@hcengineering/tracker-resources'))
  addLocation(boardId, async () => await import('@hcengineering/board-resources'))
  addLocation(hrId, async () => await import('@hcengineering/hr-resources'))
  addLocation(bitrixId, async () => await import('@hcengineering/bitrix-resources'))
  addLocation(requestId, async () => await import('@hcengineering/request-resources'))
  addLocation(driveId, async () => await import('@hcengineering/drive-resources'))
  addLocation(supportId, async () => await import('@hcengineering/support-resources'))
  addLocation(diffviewId, async () => await import('@hcengineering/diffview-resources'))
  addLocation(documentId, async () => await import('@hcengineering/document-resources'))
  addLocation(timeId, async () => await import('@hcengineering/time-resources'))
  addLocation(questionsId, async () => await import('@hcengineering/questions-resources'))
  addLocation(trainingId, async () => await import('@hcengineering/training-resources'))
  addLocation(productsId, async () => await import('@hcengineering/products-resources'))
  addLocation(documentsId, async () => await import('@hcengineering/controlled-documents-resources'))
  addLocation(uploaderId, async () => await import('@hcengineering/uploader-resources'))
  addLocation(githubId, async () => await import(/* webpackChunkName: "github" */ '@hcengineering/github-resources'))
  addLocation(
    desktopPreferencesId,
    async () => await import(/* webpackChunkName: "desktop-preferences" */ '@hcengineering/desktop-preferences-resources')
  )
  addLocation(guestId, () => import(/* webpackChunkName: "guest" */ '@hcengineering/guest-resources'))
  addLocation(loveId, () => import(/* webpackChunkName: "love" */ '@hcengineering/love-resources'))
  addLocation(printId, () => import(/* webpackChunkName: "print" */ '@hcengineering/print-resources'))
  addLocation(textEditorId, () => import(/* webpackChunkName: "text-editor" */ '@hcengineering/text-editor-resources'))
  addLocation(testManagementId, () => import(/* webpackChunkName: "test-management" */ '@hcengineering/test-management-resources'))
  addLocation(surveyId, () => import(/* webpackChunkName: "uploader" */ '@hcengineering/survey-resources'))

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

  addEventListener(workbench.event.NotifyConnection, async (evt) => {
    await ipcMain.setFrontCookie(
      config.FRONT_URL,
      presentation.metadata.Token.replaceAll(':', '-'),
      getMetadata(presentation.metadata.Token) ?? ''
    )
  })

  configureNotifications()

  if (config.INITIAL_URL !== '') {
    setLocationStorageKey('uberflow_child')
  }

  const last = localStorage.getItem(locationStorageKeyId)

  if (config.INITIAL_URL !== '') {
    console.log('NAVIGATE', config.INITIAL_URL, getCurrentLocation())
    // NavigationExpandedDefault=false fills buggy:
    // — Navigator closes in unpredictable way
    // — Many sections of the have have no default central content so without
    // navigator is looks like something is broken
    // Should consifer if we want to fix this
    // setMetadata(workbench.metadata.NavigationExpandedDefault, false)
    navigate({
      path: config.INITIAL_URL.split('/')
    })
  } else if (last !== null) {
    navigate(JSON.parse(last))
  } else {
    navigate({ path: [] })
  }

  console.log('Initial location is: ', getCurrentLocation())
}
