//
// Copyright © 2022, 2023, 2025 Hardcore Engineering Inc.
//
// Copyright © 2026 TraceX SAS.
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

import platform, { addLocation, addStringsLoader, platformId } from '@hcengineering/platform'
import * as PlatformLang from '@hcengineering/platform/lang'

import { activityId } from '@hcengineering/activity'
import aiBot, { aiBotId } from '@hcengineering/ai-bot'
import analyticsCollector, { analyticsCollectorId } from '@hcengineering/analytics-collector'
import { attachmentId } from '@hcengineering/attachment'
import admin, { adminId } from '@hcengineering/admin'
import { boardId } from '@hcengineering/board'
import calendar, { calendarId } from '@hcengineering/calendar'
import { cardId } from '@hcengineering/card'
import { formsId } from '@hcengineering/forms'
import forms from '@hcengineering/forms-resources/src/plugin'
import { chunterId } from '@hcengineering/chunter'
import client, { clientId } from '@hcengineering/client'
import contactPlugin, { contactId } from '@hcengineering/contact'
import { converterId } from '@hcengineering/converter'
import { documentsId } from '@hcengineering/controlled-documents'
import { desktopPreferencesId } from '@hcengineering/desktop-preferences'
import { diffviewId } from '@hcengineering/diffview'
import { documentId } from '@hcengineering/document'
import { driveId } from '@hcengineering/drive'
import exportPlugin, { exportId } from '@hcengineering/export'
import gmail, { gmailId } from '@hcengineering/gmail'
import globalProfile, { globalProfileId, globalProfileRoute } from '@hcengineering/global-profile'
import guest, { guestId } from '@hcengineering/guest'
import { hrId } from '@hcengineering/hr'
import { imageCropperId } from '@hcengineering/image-cropper'
import { inventoryId } from '@hcengineering/inventory'
import { leadId } from '@hcengineering/lead'
import login, { loginId } from '@hcengineering/login'
import love, { loveId } from '@hcengineering/love'
import notification, { notificationId } from '@hcengineering/notification'
import onboard, { onboardId } from '@hcengineering/onboard'
import presence, { presenceId } from '@hcengineering/presence'
import { pulseId } from '@hcengineering/pulse'
import print, { printId } from '@hcengineering/print'
import { processId } from '@hcengineering/process'
import marketplace, { marketplaceId } from '@hcengineering/marketplace'
import { productsId } from '@hcengineering/products'
import { questionsId } from '@hcengineering/questions'
import { recruitId } from '@hcengineering/recruit'
import rekoni from '@hcengineering/rekoni'
import { requestId } from '@hcengineering/request'
import setting, { settingId } from '@hcengineering/setting'
import sign from '@hcengineering/sign'
import support, { supportId, supportLink, reportBugLink, docsLink, privacyPolicyLink } from '@hcengineering/support'
import { surveyId } from '@hcengineering/survey'
import { tagsId } from '@hcengineering/tags'
import { taskId } from '@hcengineering/task'
import telegram, { telegramId } from '@hcengineering/telegram'
import { templatesId } from '@hcengineering/templates'
import { testManagementId } from '@hcengineering/test-management'
import textEditor, { textEditorId } from '@hcengineering/text-editor'
import { timeId } from '@hcengineering/time'
import tracker, { trackerId } from '@hcengineering/tracker'
import { trainingId } from '@hcengineering/training'
import uiPlugin from '@hcengineering/ui'
import { uploaderId } from '@hcengineering/uploader'
import { mediaId } from '@hcengineering/media'
import recorder, { recorderId } from '@hcengineering/recorder'
import { viewId } from '@hcengineering/view'
import workbench, { workbenchId } from '@hcengineering/workbench'
import { mailId } from '@hcengineering/mail'
import githubNext, { githubNextId } from '@hcengineering/github-next'
import { bitrixId } from '@hcengineering/bitrix'
import { integrationId } from '@hcengineering/integration'
import { achievementId } from '@hcengineering/achievement'
import { emojiId } from '@hcengineering/emoji'
import billingPlugin, { billingId } from '@hcengineering/billing'
import { hulyMailId } from '@hcengineering/huly-mail'
import { aiAssistantId } from '@hcengineering/ai-assistant'
import { ratingId } from '@hcengineering/rating'
import { qalicoId } from '@tracex/qalico'

import '@hcengineering/activity-assets'
import * as ActivityLang from '@hcengineering/activity-assets/lang'
import '@hcengineering/analytics-collector-assets'
import * as AnalyticsCollectorLang from '@hcengineering/analytics-collector-assets/lang'
import '@hcengineering/ai-bot-assets'
import * as AiBotLang from '@hcengineering/ai-bot-assets/lang'
import '@hcengineering/attachment-assets'
import * as AttachmentLang from '@hcengineering/attachment-assets/lang'
import '@hcengineering/bitrix-assets'
import * as BitrixLang from '@hcengineering/bitrix-assets/lang'
import '@hcengineering/board-assets'
import * as BoardLang from '@hcengineering/board-assets/lang'
import '@hcengineering/calendar-assets'
import * as CalendarLang from '@hcengineering/calendar-assets/lang'
import '@hcengineering/card-assets'
import '@hcengineering/forms-assets'
import * as FormsLang from '@hcengineering/forms-assets/lang'
import * as CardLang from '@hcengineering/card-assets/lang'
import '@hcengineering/chunter-assets'
import * as ChunterLang from '@hcengineering/chunter-assets/lang'
import '@hcengineering/contact-assets'
import * as ContactLang from '@hcengineering/contact-assets/lang'
import '@hcengineering/controlled-documents-assets'
import * as ControlledDocumentsLang from '@hcengineering/controlled-documents-assets/lang'
import '@hcengineering/desktop-preferences-assets'
import * as DesktopPreferencesLang from '@hcengineering/desktop-preferences-assets/lang'
import '@hcengineering/diffview-assets'
import * as DiffviewLang from '@hcengineering/diffview-assets/lang'
import '@hcengineering/document-assets'
import * as DocumentLang from '@hcengineering/document-assets/lang'
import '@hcengineering/drive-assets'
import * as DriveLang from '@hcengineering/drive-assets/lang'
import '@hcengineering/export-assets'
import * as ExportLang from '@hcengineering/export-assets/lang'
import '@hcengineering/gmail-assets'
import * as GmailLang from '@hcengineering/gmail-assets/lang'
import '@hcengineering/guest-assets'
import * as GuestLang from '@hcengineering/guest-assets/lang'
import '@hcengineering/global-profile-assets'
import * as GlobalProfileLang from '@hcengineering/global-profile-assets/lang'
import '@hcengineering/hr-assets'
import * as HrLang from '@hcengineering/hr-assets/lang'
import '@hcengineering/inventory-assets'
import * as InventoryLang from '@hcengineering/inventory-assets/lang'
import '@hcengineering/lead-assets'
import * as LeadLang from '@hcengineering/lead-assets/lang'
import '@hcengineering/login-assets'
import * as LoginLang from '@hcengineering/login-assets/lang'
import '@hcengineering/love-assets'
import * as LoveLang from '@hcengineering/love-assets/lang'
import '@hcengineering/notification-assets'
import * as OnboardLang from '@hcengineering/onboard-assets/lang'
import '@hcengineering/notification-assets'
import * as NotificationLang from '@hcengineering/notification-assets/lang'
import '@hcengineering/onboard-assets'
import * as PreferenceLang from '@hcengineering/preference-assets/lang'
import '@hcengineering/print-assets'
import * as PrintLang from '@hcengineering/print-assets/lang'
import '@hcengineering/process-assets'
import * as ProcessLang from '@hcengineering/process-assets/lang'
import '@hcengineering/marketplace-assets'
import * as MarketplaceLang from '@hcengineering/marketplace-assets/lang'
import '@hcengineering/products-assets'
import * as ProductsLang from '@hcengineering/products-assets/lang'
import '@hcengineering/questions-assets'
import * as QuestionsLang from '@hcengineering/questions-assets/lang'
import '@hcengineering/recruit-assets'
import * as RecruitLang from '@hcengineering/recruit-assets/lang'
import '@hcengineering/request-assets'
import * as RequestLang from '@hcengineering/request-assets/lang'
import '@hcengineering/setting-assets'
import * as SettingLang from '@hcengineering/setting-assets/lang'
import '@hcengineering/support-assets'
import * as SupportLang from '@hcengineering/support-assets/lang'
import '@hcengineering/survey-assets'
import * as SurveyLang from '@hcengineering/survey-assets/lang'
import '@hcengineering/tags-assets'
import * as TagsLang from '@hcengineering/tags-assets/lang'
import '@hcengineering/task-assets'
import * as TaskLang from '@hcengineering/task-assets/lang'
import '@hcengineering/telegram-assets'
import * as TelegramLang from '@hcengineering/telegram-assets/lang'
import '@hcengineering/templates-assets'
import * as TemplatesLang from '@hcengineering/templates-assets/lang'
import '@hcengineering/test-management-assets'
import * as TestManagementLang from '@hcengineering/test-management-assets/lang'
import '@hcengineering/text-editor-assets'
import * as TextEditorLang from '@hcengineering/text-editor-assets/lang'
import '@hcengineering/time-assets'
import * as TimeLang from '@hcengineering/time-assets/lang'
import '@hcengineering/tracker-assets'
import * as TrackerLang from '@hcengineering/tracker-assets/lang'
import '@hcengineering/training-assets'
import * as TrainingLang from '@hcengineering/training-assets/lang'
import '@hcengineering/uploader-assets'
import * as UploaderLang from '@hcengineering/uploader-assets/lang'
import '@hcengineering/recorder-assets'
import * as RecorderLang from '@hcengineering/recorder-assets/lang'
import '@hcengineering/media-assets'
import * as MediaLang from '@hcengineering/media-assets/lang'
import '@hcengineering/view-assets'
import * as ViewLang from '@hcengineering/view-assets/lang'
import '@hcengineering/workbench-assets'
import * as WorkbenchLang from '@hcengineering/workbench-assets/lang'
import '@hcengineering/mail-assets'
import * as MailLang from '@hcengineering/mail-assets/lang'
import '@hcengineering/achievement-assets'
import * as AchievementLang from '@hcengineering/achievement-assets/lang'
import '@hcengineering/emoji-assets'
import * as EmojiLang from '@hcengineering/emoji-assets/lang'
import '@hcengineering/billing-assets'
import * as BillingLang from '@hcengineering/billing-assets/lang'
import '@hcengineering/huly-mail-assets'
import * as HulyMailLang from '@hcengineering/huly-mail-assets/lang'
import '@hcengineering/ai-assistant-assets'
import * as AiAssistantLang from '@hcengineering/ai-assistant-assets/lang'
import '@hcengineering/rating-assets'
import * as RatingLang from '@hcengineering/rating-assets/lang'
import '@tracex/qalico-assets'
import * as QalicoLang from '@tracex/qalico-assets/lang'

import { coreId } from '@hcengineering/core'
import * as CoreLang from '@hcengineering/core/lang'
import presentation, { loadServerConfig, createFileStorage, presentationId } from '@hcengineering/presentation'

import { setMetadata } from '@hcengineering/platform'
import { initThemeStore, setDefaultLanguage } from '@hcengineering/theme'

import { preferenceId } from '@hcengineering/preference'
import { uiId } from '@hcengineering/ui/src/plugin'
import { configureAnalytics } from './analytics'
import { Analytics } from '@hcengineering/analytics'

export interface Config {
  ACCOUNTS_URL: string
  UPLOAD_URL: string
  FILES_URL: string
  DATALAKE_URL?: string
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
  GITHUB_NEXT_CLIENTID?: string
  GITHUB_URL: string
  GITHUB_NEXT_URL?: string
  LOVE_ENDPOINT?: string
  LIVEKIT_WS?: string
  SIGN_URL?: string
  PRINT_URL?: string
  MARKETPLACE_URL?: string
  ANALYTICS_COLLECTOR_URL?: string
  BRANDING_URL?: string
  TELEGRAM_BOT_URL?: string
  AI_URL?: string
  DISABLE_SIGNUP?: string
  HIDE_LOCAL_LOGIN?: string
  LINK_PREVIEW_URL?: string
  PASSWORD_STRICTNESS?: 'very_strict' | 'strict' | 'normal' | 'none'
  // Could be defined for dev environment
  FRONT_URL?: string
  PREVIEW_URL?: string
  STATS_URL?: string
  PRESENCE_URL?: string
  USE_BINARY_PROTOCOL?: boolean
  TRANSACTOR_OVERRIDE?: string
  BACKUP_URL?: string
  STREAM_URL?: string
  PUBLIC_SCHEDULE_URL?: string
  CALDAV_SERVER_URL?: string
  EXPORT_URL?: string
  MAIL_URL?: string
  BILLING_URL?: string
  PAYMENT_URL?: string
  OPENAUTH_URL?: string
  EXCLUDED_APPLICATIONS_FOR_ANONYMOUS?: string
  HULYLAKE_URL?: string
  DISABLED_FEATURES?: string
  SIGNUP_URL?: string
}

export interface Branding {
  title?: string
  links?: Array<{
    rel: string
    href: string
    type?: string
    sizes?: string
  }>
  support?: {
    supportLink?: string
    reportBugLink?: string
    docsLink?: string
    privacyPolicyLink?: string
  }
  languages?: string
  lastNameFirst?: string
  defaultLanguage?: string
  defaultApplication?: string
  defaultSpace?: string
  defaultSpecial?: string
  initWorkspace?: string
  defaultInviteRole?: string
  inviteLinkGeneratorRoles?: string[]
}

export type BrandingMap = Record<string, Branding>

const clientType = process.env.CLIENT_TYPE
const configs: Record<string, string> = {
  'dev-production': '/config-prod.json',
  'dev-staging': '/config-staging.json',
  'dev-server': '/config.json',
  'dev-server-test': '/config-test.json'
}

const PASSWORD_REQUIREMENTS: Record<NonNullable<Config['PASSWORD_STRICTNESS']>, Record<string, number>> = {
  very_strict: {
    MinDigits: 4,
    MinLength: 32,
    MinLowerChars: 4,
    MinSpecialChars: 4,
    MinUpperChars: 4
  },
  strict: {
    MinDigits: 2,
    MinLength: 16,
    MinLowerChars: 2,
    MinSpecialChars: 2,
    MinUpperChars: 2
  },
  normal: {
    MinDigits: 1,
    MinLength: 8,
    MinLowerChars: 1,
    MinSpecialChars: 1,
    MinUpperChars: 1
  },
  none: {
    MinDigits: 0,
    MinLength: 0,
    MinLowerChars: 0,
    MinSpecialChars: 0,
    MinUpperChars: 0
  }
}

function configureI18n(): void {
  // Add localization
  addStringsLoader(platformId, PlatformLang.loadLang)
  addStringsLoader(coreId, CoreLang.loadLang)
  addStringsLoader(
    presentationId,
    async (lang: string) => await import(`@hcengineering/presentation/lang/${lang}.json`)
  )
  addStringsLoader(textEditorId, TextEditorLang.loadLang)
  addStringsLoader(uiId, async (lang: string) => await import(`@hcengineering/ui/lang/${lang}.json`))
  addStringsLoader(uploaderId, UploaderLang.loadLang)
  addStringsLoader(recorderId, RecorderLang.loadLang)
  addStringsLoader(mediaId, MediaLang.loadLang)
  addStringsLoader(activityId, ActivityLang.loadLang)
  addStringsLoader(attachmentId, AttachmentLang.loadLang)
  addStringsLoader(aiBotId, AiBotLang.loadLang)
  addStringsLoader(bitrixId, BitrixLang.loadLang)
  addStringsLoader(boardId, BoardLang.loadLang)
  addStringsLoader(calendarId, CalendarLang.loadLang)
  addStringsLoader(chunterId, ChunterLang.loadLang)
  addStringsLoader(contactId, ContactLang.loadLang)
  addStringsLoader(driveId, DriveLang.loadLang)
  addStringsLoader(gmailId, GmailLang.loadLang)
  addStringsLoader(hrId, HrLang.loadLang)
  addStringsLoader(inventoryId, InventoryLang.loadLang)
  addStringsLoader(leadId, LeadLang.loadLang)
  addStringsLoader(loginId, LoginLang.loadLang)
  addStringsLoader(notificationId, NotificationLang.loadLang)
  addStringsLoader(onboardId, OnboardLang.loadLang)
  addStringsLoader(preferenceId, PreferenceLang.loadLang)
  addStringsLoader(recruitId, RecruitLang.loadLang)
  addStringsLoader(requestId, RequestLang.loadLang)
  addStringsLoader(settingId, SettingLang.loadLang)
  addStringsLoader(supportId, SupportLang.loadLang)
  addStringsLoader(tagsId, TagsLang.loadLang)
  addStringsLoader(taskId, TaskLang.loadLang)
  addStringsLoader(telegramId, TelegramLang.loadLang)
  addStringsLoader(templatesId, TemplatesLang.loadLang)
  addStringsLoader(trackerId, TrackerLang.loadLang)
  addStringsLoader(viewId, ViewLang.loadLang)
  addStringsLoader(workbenchId, WorkbenchLang.loadLang)

  addStringsLoader(desktopPreferencesId, DesktopPreferencesLang.loadLang)
  addStringsLoader(diffviewId, DiffviewLang.loadLang)
  addStringsLoader(documentId, DocumentLang.loadLang)
  addStringsLoader(timeId, TimeLang.loadLang)
  addStringsLoader(documentsId, ControlledDocumentsLang.loadLang)
  addStringsLoader(productsId, ProductsLang.loadLang)
  addStringsLoader(questionsId, QuestionsLang.loadLang)
  addStringsLoader(trainingId, TrainingLang.loadLang)
  addStringsLoader(guestId, GuestLang.loadLang)
  addStringsLoader(globalProfileId, GlobalProfileLang.loadLang)
  addStringsLoader(loveId, LoveLang.loadLang)
  addStringsLoader(printId, PrintLang.loadLang)
  addStringsLoader(exportId, ExportLang.loadLang)
  addStringsLoader(analyticsCollectorId, AnalyticsCollectorLang.loadLang)
  addStringsLoader(testManagementId, TestManagementLang.loadLang)
  addStringsLoader(surveyId, SurveyLang.loadLang)
  addStringsLoader(cardId, CardLang.loadLang)
  addStringsLoader(formsId, FormsLang.loadLang)
  addStringsLoader(mailId, MailLang.loadLang)
  addStringsLoader(processId, ProcessLang.loadLang)
  addStringsLoader(marketplaceId, MarketplaceLang.loadLang)
  addStringsLoader(achievementId, AchievementLang.loadLang)
  addStringsLoader(emojiId, EmojiLang.loadLang)
  addStringsLoader(billingId, BillingLang.loadLang)
  addStringsLoader(hulyMailId, HulyMailLang.loadLang)
  addStringsLoader(aiAssistantId, AiAssistantLang.loadLang)
  addStringsLoader(ratingId, RatingLang.loadLang)
  addStringsLoader(qalicoId, QalicoLang.loadLang)
}

export async function configurePlatform(): Promise<void> {
  setMetadata(platform.metadata.LoadHelper, async (loader) => {
    for (let i = 0; i < 5; i++) {
      try {
        return await loader()
      } catch (err: any) {
        if (err.message.includes('Loading chunk') && i != 4) {
          continue
        }
        Analytics.handleError(err)
        console.error(err)
        location.reload()
      }
    }
  })
  configureI18n()

  const config: Config = await loadServerConfig(configs[clientType ?? ''] ?? '/config.json')
  const branding: BrandingMap =
    config.BRANDING_URL !== undefined ? await (await fetch(config.BRANDING_URL, { keepalive: true })).json() : {}
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
  setMetadata(login.metadata.OAuthURL, config.OPENAUTH_URL)
  setMetadata(login.metadata.DisableSignUp, config.DISABLE_SIGNUP === 'true')
  setMetadata(login.metadata.HideLocalLogin, config.HIDE_LOCAL_LOGIN === 'true')

  setMetadata(login.metadata.PasswordValidations, PASSWORD_REQUIREMENTS[config.PASSWORD_STRICTNESS ?? 'none'])

  setMetadata(presentation.metadata.UploadURL, config.UPLOAD_URL)
  setMetadata(presentation.metadata.DatalakeUrl, config.DATALAKE_URL)
  setMetadata(
    presentation.metadata.FileStorage,
    createFileStorage(config.UPLOAD_URL, config.DATALAKE_URL, config.HULYLAKE_URL)
  )
  setMetadata(presentation.metadata.CollaboratorUrl, config.COLLABORATOR_URL)

  setMetadata(presentation.metadata.FrontUrl, config.FRONT_URL)
  setMetadata(presentation.metadata.PreviewUrl, config.PREVIEW_URL)
  setMetadata(presentation.metadata.StatsUrl, config.STATS_URL)
  setMetadata(presentation.metadata.LinkPreviewUrl, config.LINK_PREVIEW_URL)
  setMetadata(presentation.metadata.MailUrl, config.MAIL_URL)
  setMetadata(presentation.metadata.SignupUrl, config.SIGNUP_URL ?? 'https://huly.io/signup')

  const disabledFeatures = (config.DISABLED_FEATURES ??'').split(',').map(it => it.trim()).filter(it => it.length > 0)
  setMetadata(presentation.metadata.DisabledFeatures, new Set(disabledFeatures))

  setMetadata(recorder.metadata.StreamUrl, config.STREAM_URL)
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
  setMetadata(telegram.metadata.BotUrl, config.TELEGRAM_BOT_URL ?? 'http://tracex.local:4020')
  setMetadata(gmail.metadata.GmailURL, config.GMAIL_URL ?? 'http://localhost:8087')
  setMetadata(calendar.metadata.CalendarServiceURL, config.CALENDAR_URL ?? 'http://localhost:8095')
  setMetadata(calendar.metadata.PublicScheduleURL, config.PUBLIC_SCHEDULE_URL)
  setMetadata(calendar.metadata.CalDavServerURL, config.CALDAV_SERVER_URL)
  setMetadata(notification.metadata.PushPublicKey, config.PUSH_PUBLIC_KEY)
  setMetadata(analyticsCollector.metadata.EndpointURL, config.ANALYTICS_COLLECTOR_URL)
  setMetadata(aiBot.metadata.EndpointURL, config.AI_URL)

  setMetadata(githubNext.metadata.GithubClientID, config.GITHUB_NEXT_CLIENTID ?? '')
  setMetadata(githubNext.metadata.GithubNextURL, config.GITHUB_NEXT_URL ?? 'http://tracex.local:3510')

  setMetadata(rekoni.metadata.RekoniUrl, config.REKONI_URL)

  setMetadata(uiPlugin.metadata.DefaultApplication, login.component.LoginApp)
  setMetadata(contactPlugin.metadata.LastNameFirst, myBranding.lastNameFirst === 'true')
  setMetadata(love.metadata.ServiceEndpoint, config.LOVE_ENDPOINT)
  setMetadata(love.metadata.WebSocketURL, config.LIVEKIT_WS)
  setMetadata(print.metadata.PrintURL, config.PRINT_URL)
  setMetadata(sign.metadata.SignURL, config.SIGN_URL)
  setMetadata(marketplace.metadata.Url, config.MARKETPLACE_URL)
  setMetadata(presence.metadata.PresenceUrl, config.PRESENCE_URL ?? '')
  setMetadata(exportPlugin.metadata.ExportUrl, config.EXPORT_URL ?? '')

  setMetadata(billingPlugin.metadata.BillingURL, config.BILLING_URL ?? '')
  setMetadata(presentation.metadata.PaymentUrl, config.PAYMENT_URL ?? '')

  setMetadata(presentation.metadata.HulylakeUrl, config.HULYLAKE_URL ?? '')

  setMetadata(support.metadata.SupportLink, myBranding.support?.supportLink ?? supportLink)
  setMetadata(support.metadata.ReportBugLink, myBranding.support?.reportBugLink ?? reportBugLink)
  setMetadata(support.metadata.DocsLink, myBranding.support?.docsLink ?? docsLink)
  setMetadata(support.metadata.PrivacyPolicyLink, myBranding.support?.privacyPolicyLink ?? privacyPolicyLink)

  const languages = myBranding.languages
    ? myBranding.languages.split(',').map((l) => l.trim())
    : ['en', 'ru', 'es', 'pl', 'pt', 'pt-br', 'zh', 'fr', 'cs', 'it', 'de', 'ja', 'ko', 'tr']

  setMetadata(uiPlugin.metadata.Languages, languages)

  setMetadata(
    uiPlugin.metadata.Routes,
    new Map([
      [workbenchId, workbench.component.WorkbenchApp],
      [formsId, forms.component.FormsApp],
      [adminId, admin.component.AdminApp],
      [loginId, login.component.LoginApp],
      [onboardId, onboard.component.OnboardApp],
      [calendarId, calendar.component.ConnectApp],
      [guestId, guest.component.GuestApp],
      [printId, print.component.PrintApp],
      [globalProfileRoute, globalProfile.component.GlobalProfileApp],
      ['meetings', love.component.GuestMeetingApp]
    ])
  )

  addLocation(formsId, () => import(/* webpackChunkName: "forms" */ '@hcengineering/forms-resources'))
  addLocation(coreId, async () => ({ default: async () => ({}) }))
  addLocation(presentationId, async () => ({ default: async () => ({}) }))

  addLocation(clientId, async () => await import(/* webpackChunkName: "client" */ '@hcengineering/client-resources'))
  addLocation(loginId, async () => await import(/* webpackChunkName: "login" */ '@hcengineering/login-resources'))
  addLocation(adminId, async () => await import(/* webpackChunkName: "admin" */ '@hcengineering/admin-resources'))
  addLocation(onboardId, async () => await import(/* webpackChunkName: "onboard" */ '@hcengineering/onboard-resources'))
  addLocation(
    workbenchId,
    async () => await import(/* webpackChunkName: "workbench" */ '@hcengineering/workbench-resources')
  )
  addLocation(viewId, async () => await import(/* webpackChunkName: "view" */ '@hcengineering/view-resources'))
  addLocation(converterId, async () => await import(/* webpackChunkName: "converter" */ '@hcengineering/converter-resources'))
  addLocation(taskId, async () => await import(/* webpackChunkName: "task" */ '@hcengineering/task-resources'))
  addLocation(contactId, async () => await import(/* webpackChunkName: "contact" */ '@hcengineering/contact-resources'))
  addLocation(chunterId, async () => await import(/* webpackChunkName: "chunter" */ '@hcengineering/chunter-resources'))
  addLocation(recruitId, async () => await import(/* webpackChunkName: "recruit" */ '@hcengineering/recruit-resources'))
  addLocation(
    activityId,
    async () => await import(/* webpackChunkName: "activity" */ '@hcengineering/activity-resources')
  )
  addLocation(settingId, async () => await import(/* webpackChunkName: "setting" */ '@hcengineering/setting-resources'))
  addLocation(leadId, async () => await import(/* webpackChunkName: "lead" */ '@hcengineering/lead-resources'))
  addLocation(
    telegramId,
    async () => await import(/* webpackChunkName: "telegram" */ '@hcengineering/telegram-resources')
  )
  addLocation(
    attachmentId,
    async () => await import(/* webpackChunkName: "attachment" */ '@hcengineering/attachment-resources')
  )
  addLocation(gmailId, async () => await import(/* webpackChunkName: "gmail" */ '@hcengineering/gmail-resources'))
  addLocation(
    imageCropperId,
    async () => await import(/* webpackChunkName: "image-cropper" */ '@hcengineering/image-cropper-resources')
  )
  addLocation(
    inventoryId,
    async () => await import(/* webpackChunkName: "inventory" */ '@hcengineering/inventory-resources')
  )
  addLocation(
    templatesId,
    async () => await import(/* webpackChunkName: "templates" */ '@hcengineering/templates-resources')
  )
  addLocation(
    notificationId,
    async () => await import(/* webpackChunkName: "notification" */ '@hcengineering/notification-resources')
  )
  addLocation(tagsId, async () => await import(/* webpackChunkName: "tags" */ '@hcengineering/tags-resources'))
  addLocation(
    calendarId,
    async () => await import(/* webpackChunkName: "calendar" */ '@hcengineering/calendar-resources')
  )
  addLocation(
    diffviewId,
    async () => await import(/* webpackChunkName: "diffview" */ '@hcengineering/diffview-resources')
  )
  addLocation(timeId, async () => await import(/* webpackChunkName: "time" */ '@hcengineering/time-resources'))
  addLocation(
    desktopPreferencesId,
    async () =>
      await import(/* webpackChunkName: "desktop-preferences" */ '@hcengineering/desktop-preferences-resources')
  )
  addLocation(analyticsCollectorId, async () => await import('@hcengineering/analytics-collector-resources'))
  addLocation(aiBotId, async () => await import('@hcengineering/ai-bot-resources'))

  addLocation(trackerId, async () => await import(/* webpackChunkName: "tracker" */ '@hcengineering/tracker-resources'))
  addLocation(boardId, async () => await import(/* webpackChunkName: "board" */ '@hcengineering/board-resources'))
  addLocation(hrId, async () => await import(/* webpackChunkName: "hr" */ '@hcengineering/hr-resources'))
  addLocation(bitrixId, async () => await import(/* webpackChunkName: "bitrix" */ '@hcengineering/bitrix-resources'))
  addLocation(requestId, async () => await import(/* webpackChunkName: "request" */ '@hcengineering/request-resources'))
  addLocation(driveId, async () => await import(/* webpackChunkName: "drive" */ '@hcengineering/drive-resources'))
  addLocation(supportId, async () => await import(/* webpackChunkName: "support" */ '@hcengineering/support-resources'))

  addLocation(
    documentId,
    async () => await import(/* webpackChunkName: "document" */ '@hcengineering/document-resources')
  )
  addLocation(
    githubNextId,
    async () => await import(/* webpackChunkName: "github-next" */ '@hcengineering/github-next-resources')
  )
  addLocation(
    questionsId,
    async () => await import(/* webpackChunkName: "training" */ '@hcengineering/questions-resources')
  )
  addLocation(
    trainingId,
    async () => await import(/* webpackChunkName: "training" */ '@hcengineering/training-resources')
  )
  addLocation(
    productsId,
    async () => await import(/* webpackChunkName: "products" */ '@hcengineering/products-resources')
  )
  addLocation(
    documentsId,
    async () => await import(/* webpackChunkName: "documents" */ '@hcengineering/controlled-documents-resources')
  )
  addLocation(guestId, async () => await import(/* webpackChunkName: "guest" */ '@hcengineering/guest-resources'))
  addLocation(
    globalProfileId,
    async () => await import(/* webpackChunkName: "global-profile" */ '@hcengineering/global-profile-resources')
  )
  addLocation(loveId, async () => await import(/* webpackChunkName: "love" */ '@hcengineering/love-resources'))
  addLocation(printId, async () => await import(/* webpackChunkName: "print" */ '@hcengineering/print-resources'))
  addLocation(exportId, async () => await import(/* webpackChunkName: "export" */ '@hcengineering/export-resources'))
  addLocation(
    textEditorId,
    async () => await import(/* webpackChunkName: "text-editor" */ '@hcengineering/text-editor-resources')
  )
  addLocation(
    uploaderId,
    async () => await import(/* webpackChunkName: "uploader" */ '@hcengineering/uploader-resources')
  )
  addLocation(
    recorderId,
    async () => await import(/* webpackChunkName: "recorder" */ '@hcengineering/recorder-resources')
  )
  addLocation(mediaId, async () => await import(/* webpackChunkName: "media" */ '@hcengineering/media-resources'))

  addLocation(
    testManagementId,
    async () => await import(/* webpackChunkName: "test-management" */ '@hcengineering/test-management-resources')
  )
  addLocation(surveyId, async () => await import(/* webpackChunkName: "survey" */ '@hcengineering/survey-resources'))
  addLocation(
    presenceId,
    async () => await import(/* webpackChunkName: "presence" */ '@hcengineering/presence-resources')
  )
  addLocation(cardId, async () => await import(/* webpackChunkName: "card" */ '@hcengineering/card-resources'))
  addLocation(processId, async () => await import(/* webpackChunkName: "process" */ '@hcengineering/process-resources'))
  addLocation(marketplaceId, async () => await import(/* webpackChunkName: "marketplace" */ '@hcengineering/marketplace-resources'))
  addLocation(
    integrationId,
    async () => await import(/* webpackChunkName: "integration" */ '@hcengineering/integration-resources')
  )
  addLocation(
    achievementId,
    async () => await import(/* webpackChunkName: "achievement" */ '@hcengineering/achievement-resources')
  )
  addLocation(emojiId, async () => await import(/* webpackChunkName: "emoji" */ '@hcengineering/emoji-resources'))
  if ((config.BILLING_URL ?? '') !== '') {
    addLocation(
      billingId,
      async () => await import(/* webpackChunkName: "billing" */ '@hcengineering/billing-resources')
    )
  }
  addLocation(
    hulyMailId,
    async () => await import(/* webpackChunkName: "hulyMail" */ '@hcengineering/huly-mail-resources')
  )
  addLocation(
    aiAssistantId,
    async () => await import(/* webpackChunkName: "ai-assistant" */ '@hcengineering/ai-assistant-resources')
  )
  addLocation(ratingId, async () => await import(/* webpackChunkName: "rating" */ '@hcengineering/rating-resources'))

  setMetadata(client.metadata.FilterModel, 'ui')
  setMetadata(client.metadata.ExtraFilter, disabledFeatures)
  setMetadata(client.metadata.ExtraPlugins, [preferenceId, qalicoId, pulseId])
  setMetadata(login.metadata.TransactorOverride, config.TRANSACTOR_OVERRIDE)

  // Use binary response transfer for faster performance and small transfer sizes.
  const binaryOverride = localStorage.getItem(client.metadata.UseBinaryProtocol)
  setMetadata(
    client.metadata.UseBinaryProtocol,
    binaryOverride != null ? binaryOverride === 'true' : (config.USE_BINARY_PROTOCOL ?? true)
  )

  // Disable for now, since it causes performance issues on linux/docker/kubernetes boxes for now.
  setMetadata(client.metadata.UseProtocolCompression, true)

  setMetadata(uiPlugin.metadata.PlatformTitle, title)
  setMetadata(workbench.metadata.PlatformTitle, title)
  setDefaultLanguage(myBranding.defaultLanguage ?? 'en')
  setMetadata(workbench.metadata.DefaultApplication, myBranding.defaultApplication ?? 'tracker')
  setMetadata(workbench.metadata.DefaultSpace, myBranding.defaultSpace ?? tracker.project.DefaultProject)
  setMetadata(workbench.metadata.DefaultSpecial, myBranding.defaultSpecial ?? 'issues')

  setMetadata(setting.metadata.DefaultInviteRole, myBranding.defaultInviteRole)
  setMetadata(setting.metadata.DefaultInviteLinkGeneratorRoles, myBranding.inviteLinkGeneratorRoles)

  try {
    const parsed = JSON.parse(config.EXCLUDED_APPLICATIONS_FOR_ANONYMOUS ?? '')
    setMetadata(workbench.metadata.ExcludedApplicationsForAnonymous, Array.isArray(parsed) ? parsed : [])
  } catch (err) {
    setMetadata(workbench.metadata.ExcludedApplicationsForAnonymous, [])
  }

  setMetadata(setting.metadata.BackupUrl, config.BACKUP_URL ?? '')

  initThemeStore()
}
