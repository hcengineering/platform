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
import aiBot, { aiBotId } from '@hcengineering/ai-bot'
import { attachmentId } from '@hcengineering/attachment'
import { bitrixId } from '@hcengineering/bitrix'
import { boardId } from '@hcengineering/board'
import calendar, { calendarId } from '@hcengineering/calendar'
import { cardId } from '@hcengineering/card'
import { chunterId } from '@hcengineering/chunter'
import client, { clientId } from '@hcengineering/client'
import contactPlugin, { contactId } from '@hcengineering/contact'
import { documentsId } from '@hcengineering/controlled-documents'
import { desktopPreferencesId } from '@hcengineering/desktop-preferences'
import { desktopDownloadsId } from '@hcengineering/desktop-downloads'
import { diffviewId } from '@hcengineering/diffview'
import { documentId } from '@hcengineering/document'
import { driveId } from '@hcengineering/drive'
import exportPlugin, { exportId } from '@hcengineering/export'
import gmail, { gmailId } from '@hcengineering/gmail'
import guest, { guestId } from '@hcengineering/guest'
import { hrId } from '@hcengineering/hr'
import { imageCropperId } from '@hcengineering/image-cropper'
import { inventoryId } from '@hcengineering/inventory'
import { leadId } from '@hcengineering/lead'
import login, { loginId } from '@hcengineering/login'
import notification, { notificationId } from '@hcengineering/notification'
import onboard, { onboardId } from '@hcengineering/onboard'
import presence, { presenceId } from '@hcengineering/presence'
import { processId } from '@hcengineering/process'
import { productsId } from '@hcengineering/products'
import { questionsId } from '@hcengineering/questions'
import { recruitId } from '@hcengineering/recruit'
import rekoni from '@hcengineering/rekoni'
import { requestId } from '@hcengineering/request'
import setting, { settingId } from '@hcengineering/setting'
import { supportId } from '@hcengineering/support'
import { surveyId } from '@hcengineering/survey'
import { tagsId } from '@hcengineering/tags'
import { taskId } from '@hcengineering/task'
import telegram, { telegramId } from '@hcengineering/telegram'
import { templatesId } from '@hcengineering/templates'
import { testManagementId } from '@hcengineering/test-management'
import { timeId } from '@hcengineering/time'
import tracker, { trackerId } from '@hcengineering/tracker'
import { trainingId } from '@hcengineering/training'
import uiPlugin, { getCurrentLocation, locationStorageKeyId, navigate, setLocationStorageKey } from '@hcengineering/ui'
import { mediaId } from '@hcengineering/media'
import { uploaderId } from '@hcengineering/uploader'
import recorder, { recorderId } from '@hcengineering/recorder'
import { viewId } from '@hcengineering/view'
import workbench, { workbenchId } from '@hcengineering/workbench'
import { mailId } from '@hcengineering/mail'
import { chatId } from '@hcengineering/chat'
import { inboxId } from '@hcengineering/inbox'
import { achievementId } from '@hcengineering/achievement'
import communication, { communicationId } from '@hcengineering/communication'
import { emojiId } from '@hcengineering/emoji'
import billingPlugin, { billingId } from '@hcengineering/billing'

import '@hcengineering/activity-assets'
import '@hcengineering/analytics-collector-assets'
import '@hcengineering/attachment-assets'
import '@hcengineering/bitrix-assets'
import '@hcengineering/board-assets'
import '@hcengineering/calendar-assets'
import '@hcengineering/card-assets'
import '@hcengineering/chunter-assets'
import '@hcengineering/contact-assets'
import '@hcengineering/controlled-documents-assets'
import '@hcengineering/desktop-preferences-assets'
import '@hcengineering/desktop-downloads-assets'
import '@hcengineering/diffview-assets'
import '@hcengineering/document-assets'
import '@hcengineering/drive-assets'
import '@hcengineering/export-assets'
import '@hcengineering/gmail-assets'
import '@hcengineering/guest-assets'
import '@hcengineering/hr-assets'
import '@hcengineering/inventory-assets'
import '@hcengineering/lead-assets'
import '@hcengineering/login-assets'
import '@hcengineering/love-assets'
import '@hcengineering/notification-assets'
import '@hcengineering/preference-assets'
import '@hcengineering/print-assets'
import '@hcengineering/process-assets'
import '@hcengineering/products-assets'
import '@hcengineering/questions-assets'
import '@hcengineering/recruit-assets'
import '@hcengineering/request-assets'
import '@hcengineering/setting-assets'
import '@hcengineering/support-assets'
import '@hcengineering/survey-assets'
import '@hcengineering/tags-assets'
import '@hcengineering/task-assets'
import '@hcengineering/telegram-assets'
import '@hcengineering/templates-assets'
import '@hcengineering/test-management-assets'
import '@hcengineering/text-editor-assets'
import '@hcengineering/time-assets'
import '@hcengineering/tracker-assets'
import '@hcengineering/training-assets'
import '@hcengineering/uploader-assets'
import '@hcengineering/recorder-assets'
import '@hcengineering/view-assets'
import '@hcengineering/workbench-assets'
import '@hcengineering/mail-assets'
import '@hcengineering/chat-assets'
import '@hcengineering/inbox-assets'
import '@hcengineering/achievement-assets'
import '@hcengineering/emoji-assets'
import '@hcengineering/media-assets'
import '@hcengineering/communication-assets'
import '@hcengineering/billing-assets'

import analyticsCollector, { analyticsCollectorId } from '@hcengineering/analytics-collector'
import { coreId } from '@hcengineering/core'
import love, { loveId } from '@hcengineering/love'
import presentation, { parsePreviewConfig, parseUploadConfig, presentationId } from '@hcengineering/presentation'
import print, { printId } from '@hcengineering/print'
import sign from '@hcengineering/sign'
import textEditor, { textEditorId } from '@hcengineering/text-editor'

import { initThemeStore, setDefaultLanguage } from '@hcengineering/theme'
import { configureNotifications } from './notifications'
import { configureAnalyticsProviders } from '@hcengineering/analytics-providers'
import { Branding, Config, } from './types'
import { ipcMainExposed } from './typesUtils'

import github, { githubId } from '@hcengineering/github'
import '@hcengineering/github-assets'
import { preferenceId } from '@hcengineering/preference'
import { uiId } from '@hcengineering/ui/src/plugin'

function configureI18n (): void {
  // Add localization
  addStringsLoader(platformId, async (lang: string) => await import(
    /* webpackInclude: /\.json$/ */
    /* webpackMode: "lazy" */
    /* webpackChunkName: "lang-[request]" */
    `@hcengineering/platform/lang/${lang}.json`
  ))
  addStringsLoader(coreId, async (lang: string) => await import(
    /* webpackInclude: /\.json$/ */
    /* webpackMode: "lazy" */
    /* webpackChunkName: "lang-[request]" */
    `@hcengineering/core/lang/${lang}.json`
  ))
  addStringsLoader(
    presentationId,
    async (lang: string) => await import(`@hcengineering/presentation/lang/${lang}.json`)
  )
  addStringsLoader(textEditorId, async (lang: string) => await import(`@hcengineering/text-editor-assets/lang/${lang}.json`))
  addStringsLoader(uiId, async (lang: string) => await import(`@hcengineering/ui/lang/${lang}.json`))
  addStringsLoader(mediaId, async (lang: string) => await import(`@hcengineering/media-assets/lang/${lang}.json`))
  addStringsLoader(uploaderId, async (lang: string) => await import(`@hcengineering/uploader-assets/lang/${lang}.json`))
  addStringsLoader(recorderId, async (lang: string) => await import(`@hcengineering/recorder-assets/lang/${lang}.json`))
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
  addStringsLoader(
    desktopDownloadsId,
    async (lang: string) => await import(`@hcengineering/desktop-downloads-assets/lang/${lang}.json`)
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
  addStringsLoader(exportId, async (lang: string) => await import(`@hcengineering/export-assets/lang/${lang}.json`))
  addStringsLoader(analyticsCollectorId, async (lang: string) => await import(`@hcengineering/analytics-collector-assets/lang/${lang}.json`))
  addStringsLoader(testManagementId, async (lang: string) => await import(`@hcengineering/test-management-assets/lang/${lang}.json`))
  addStringsLoader(surveyId, async (lang: string) => await import(`@hcengineering/survey-assets/lang/${lang}.json`))
  addStringsLoader(cardId, async (lang: string) => await import(`@hcengineering/card-assets/lang/${lang}.json`))
  addStringsLoader(mailId, async (lang: string) => await import(`@hcengineering/mail-assets/lang/${lang}.json`))
  addStringsLoader(chatId, async (lang: string) => await import(`@hcengineering/chat-assets/lang/${lang}.json`))
  addStringsLoader(inboxId, async (lang: string) => await import(`@hcengineering/inbox-assets/lang/${lang}.json`))
  addStringsLoader(processId, async (lang: string) => await import(`@hcengineering/process-assets/lang/${lang}.json`))
  addStringsLoader(achievementId, async (lang: string) => await import(`@hcengineering/achievement-assets/lang/${lang}.json`))
  addStringsLoader(communicationId, async (lang: string) => await import(`@hcengineering/communication-assets/lang/${lang}.json`))
  addStringsLoader(emojiId, async (lang: string) => await import(`@hcengineering/emoji-assets/lang/${lang}.json`))
  addStringsLoader(billingId, async (lang: string) => await import(`@hcengineering/billing-assets/lang/${lang}.json`))
}

export class PlatformBranding {
  constructor(private title: string) {
  }
  public getTitle(): string {
    return this.title;
  }
}

export class PlatformParameters {
  constructor(private branding: PlatformBranding) {
  }
  public getBranding(): PlatformBranding {
    return this.branding;
  }
}

export async function configurePlatform (onWorkbenchConnect?: () => Promise<void>): Promise<PlatformParameters> {
  configureI18n()

  const ipcMain = ipcMainExposed()
  const config: Config = await ipcMain.config()
  const myBranding: Branding = await ipcMain.branding()
  // await (await fetch(devConfig? '/config-dev.json' : '/config.json')).json()
  console.log('loading configuration', config)
  console.log('loaded branding', myBranding)

  const title = myBranding.title ?? 'Huly Desktop'
  ipcMain.setTitle(title)

  configureAnalyticsProviders(config)

  setMetadata(login.metadata.AccountsUrl, config.ACCOUNTS_URL)
  setMetadata(login.metadata.DisableSignUp, config.DISABLE_SIGNUP === 'true')
  setMetadata(login.metadata.HideLocalLogin, config.HIDE_LOCAL_LOGIN === 'true')
  setMetadata(presentation.metadata.UploadURL, config.UPLOAD_URL)
  setMetadata(presentation.metadata.FilesURL, config.FILES_URL)
  setMetadata(presentation.metadata.CollaboratorUrl, config.COLLABORATOR_URL)
  setMetadata(presentation.metadata.PreviewConfig, parsePreviewConfig(config.PREVIEW_CONFIG))
  setMetadata(presentation.metadata.UploadConfig, parseUploadConfig(config.UPLOAD_CONFIG, config.UPLOAD_URL))
  setMetadata(presentation.metadata.FrontUrl, config.FRONT_URL)
  setMetadata(presentation.metadata.LinkPreviewUrl, config.LINK_PREVIEW_URL ?? '')
  setMetadata(presentation.metadata.MailUrl, config.MAIL_URL)
  setMetadata(recorder.metadata.StreamUrl, config.STREAM_URL ?? '')
  setMetadata(presentation.metadata.StatsUrl, config.STATS_URL)

  setMetadata(textEditor.metadata.Collaborator, config.COLLABORATOR ?? '')

  setMetadata(github.metadata.GithubApplication, config.GITHUB_APP ?? '')
  setMetadata(github.metadata.GithubClientID, config.GITHUB_CLIENTID ?? '')
  setMetadata(github.metadata.GithubURL, config.GITHUB_URL ?? '')

  setMetadata(communication.metadata.Enabled, config.COMMUNICATION_API_ENABLED === 'true')

  if (config.MODEL_VERSION != null) {
    console.log('Minimal Model version requirement', config.MODEL_VERSION)
    setMetadata(presentation.metadata.ModelVersion, config.MODEL_VERSION)
  }
  if (config.VERSION != null) {
    console.log('Minimal version requirement', config.VERSION)
    setMetadata(presentation.metadata.FrontVersion, config.VERSION)
  }
  setMetadata(telegram.metadata.TelegramURL, config.TELEGRAM_URL ?? 'http://localhost:8086')
  setMetadata(telegram.metadata.BotUrl, config.TELEGRAM_BOT_URL ?? 'http://huly.local:4020')
  setMetadata(gmail.metadata.GmailURL, config.GMAIL_URL ?? 'http://localhost:8087')
  setMetadata(calendar.metadata.CalendarServiceURL, config.CALENDAR_URL ?? 'http://localhost:8095')
  setMetadata(calendar.metadata.PublicScheduleURL, config.PUBLIC_SCHEDULE_URL)
  setMetadata(calendar.metadata.CalDavServerURL, config.CALDAV_SERVER_URL)
  setMetadata(notification.metadata.PushPublicKey, config.PUSH_PUBLIC_KEY)

  setMetadata(rekoni.metadata.RekoniUrl, config.REKONI_URL)
  setMetadata(contactPlugin.metadata.LastNameFirst, myBranding.lastNameFirst === 'true')
  setMetadata(love.metadata.ServiceEnpdoint, config.LOVE_ENDPOINT)
  setMetadata(love.metadata.WebSocketURL, config.LIVEKIT_WS)
  setMetadata(print.metadata.PrintURL, config.PRINT_URL)
  setMetadata(sign.metadata.SignURL, config.SIGN_URL)
  setMetadata(uiPlugin.metadata.DefaultApplication, login.component.LoginApp)
  setMetadata(analyticsCollector.metadata.EndpointURL, config.ANALYTICS_COLLECTOR_URL)
  setMetadata(aiBot.metadata.EndpointURL, config.AI_URL)
  setMetadata(presence.metadata.PresenceUrl, config.PRESENCE_URL ?? '')
  setMetadata(exportPlugin.metadata.ExportUrl, config.EXPORT_URL ?? '')

  setMetadata(billingPlugin.metadata.BillingURL, config.BILLING_URL ?? '')

  const languages = myBranding.languages !== undefined && myBranding.languages !== '' ? myBranding.languages.split(',').map((l) => l.trim()) : ['en', 'ru', 'es', 'pt', 'zh', 'fr', 'cs', 'it', 'de', 'ja']

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
  addLocation(mediaId, async () => await import('@hcengineering/media-resources'))
  addLocation(uploaderId, async () => await import('@hcengineering/uploader-resources'))
  addLocation(recorderId, async () => await import('@hcengineering/recorder-resources'))
  addLocation(presenceId, async () => await import('@hcengineering/presence-resources'))
  addLocation(githubId, async () => await import(/* webpackChunkName: "github" */ '@hcengineering/github-resources'))
  addLocation(
    desktopPreferencesId,
    async () => await import(/* webpackChunkName: "desktop-preferences" */ '@hcengineering/desktop-preferences-resources')
  )
  addLocation(
    desktopDownloadsId,
    async () => await import(/* webpackChunkName: "desktop-downloads" */ '@hcengineering/desktop-downloads-resources')
  )
  addLocation(guestId, () => import(/* webpackChunkName: "guest" */ '@hcengineering/guest-resources'))
  addLocation(loveId, () => import(/* webpackChunkName: "love" */ '@hcengineering/love-resources'))
  addLocation(printId, () => import(/* webpackChunkName: "print" */ '@hcengineering/print-resources'))
  addLocation(exportId, () => import(/* webpackChunkName: "export" */ '@hcengineering/export-resources'))
  addLocation(textEditorId, () => import(/* webpackChunkName: "text-editor" */ '@hcengineering/text-editor-resources'))
  addLocation(testManagementId, () => import(/* webpackChunkName: "test-management" */ '@hcengineering/test-management-resources'))
  addLocation(surveyId, () => import(/* webpackChunkName: "survey" */ '@hcengineering/survey-resources'))
  addLocation(cardId, () => import(/* webpackChunkName: "card" */ '@hcengineering/card-resources'))
  addLocation(chatId, () => import(/* webpackChunkName: "chat" */ '@hcengineering/chat-resources'))
  addLocation(inboxId, () => import(/* webpackChunkName: "inbox" */ '@hcengineering/inbox-resources'))
  addLocation(processId, () => import(/* webpackChunkName: "process" */ '@hcengineering/process-resources'))
  addLocation(achievementId, () => import(/* webpackChunkName: "achievement" */ '@hcengineering/achievement-resources'))
  addLocation(communicationId, () => import(/* webpackChunkName: "communication" */ '@hcengineering/communication-resources'))
  addLocation(emojiId, () => import(/* webpackChunkName: "achievement" */ '@hcengineering/emoji-resources'))
  addLocation(billingId, () => import(/* webpackChunkName: "achievement" */ '@hcengineering/billing-resources'))

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

  try {
    const parsed = JSON.parse(config.EXCLUDED_APPLICATIONS_FOR_ANONYMOUS ?? '')
    setMetadata(workbench.metadata.ExcludedApplicationsForAnonymous, Array.isArray(parsed) ? parsed : [])
  } catch (err) {
    setMetadata(workbench.metadata.ExcludedApplicationsForAnonymous, [])
  }

  initThemeStore()

  addEventListener(workbench.event.NotifyConnection, async () => {
    await ipcMain.setFrontCookie(
      config.FRONT_URL,
      presentation.metadata.Token.replaceAll(':', '-'),
      getMetadata(presentation.metadata.Token) ?? ''
    )
    await onWorkbenchConnect?.()
  })

  configureNotifications()

  setMetadata(setting.metadata.BackupUrl, config.BACKUP_URL ?? '')

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

  return new PlatformParameters(new PlatformBranding(title))
}
