import { coreId } from '@hcengineering/core'

import { activityId } from '@hcengineering/activity'
import { attachmentId } from '@hcengineering/attachment'
import { bitrixId } from '@hcengineering/bitrix'
import { boardId } from '@hcengineering/board'
import { calendarId } from '@hcengineering/calendar'
import { chunterId } from '@hcengineering/chunter'
import { contactId } from '@hcengineering/contact'
import { driveId } from '@hcengineering/drive'
import { gmailId } from '@hcengineering/gmail'
import { hrId } from '@hcengineering/hr'
import { inventoryId } from '@hcengineering/inventory'
import { leadId } from '@hcengineering/lead'
import { loginId } from '@hcengineering/login'
import { notificationId } from '@hcengineering/notification'
import { preferenceId } from '@hcengineering/preference'
import { recruitId } from '@hcengineering/recruit'
import { requestId } from '@hcengineering/request'
import { settingId } from '@hcengineering/setting'
import { supportId } from '@hcengineering/support'
import { tagsId } from '@hcengineering/tags'
import { taskId } from '@hcengineering/task'
import { telegramId } from '@hcengineering/telegram'
import { templatesId } from '@hcengineering/templates'
import { trackerId } from '@hcengineering/tracker'
import { viewId } from '@hcengineering/view'
import { workbenchId } from '@hcengineering/workbench'
import { documentId } from '@hcengineering/document'
import { githubId } from '@hcengineering/github'

import activityEn from '@hcengineering/activity-assets/lang/en.json'
import attachmentEn from '@hcengineering/attachment-assets/lang/en.json'
import bitrixEn from '@hcengineering/bitrix-assets/lang/en.json'
import boardEn from '@hcengineering/board-assets/lang/en.json'
import calendarEn from '@hcengineering/calendar-assets/lang/en.json'
import chunterEn from '@hcengineering/chunter-assets/lang/en.json'
import contactEn from '@hcengineering/contact-assets/lang/en.json'
import coreEng from '@hcengineering/core/lang/en.json'
import driveEn from '@hcengineering/drive-assets/lang/en.json'
import gmailEn from '@hcengineering/gmail-assets/lang/en.json'
import hrEn from '@hcengineering/hr-assets/lang/en.json'
import inventoryEn from '@hcengineering/inventory-assets/lang/en.json'
import leadEn from '@hcengineering/lead-assets/lang/en.json'
import loginEng from '@hcengineering/login-assets/lang/en.json'
import platformEng from '@hcengineering/platform/lang/en.json'
import notificationEn from '@hcengineering/notification-assets/lang/en.json'
import { addStringsLoader, platformId } from '@hcengineering/platform'
import preferenceEn from '@hcengineering/preference-assets/lang/en.json'
import recruitEn from '@hcengineering/recruit-assets/lang/en.json'
import requestEn from '@hcengineering/request-assets/lang/en.json'
import settingEn from '@hcengineering/setting-assets/lang/en.json'
import supportEn from '@hcengineering/support-assets/lang/en.json'
import tagsEn from '@hcengineering/tags-assets/lang/en.json'
import taskEn from '@hcengineering/task-assets/lang/en.json'
import telegramEn from '@hcengineering/telegram-assets/lang/en.json'
import templatesEn from '@hcengineering/templates-assets/lang/en.json'
import trackerEn from '@hcengineering/tracker-assets/lang/en.json'
import viewEn from '@hcengineering/view-assets/lang/en.json'
import workbenchEn from '@hcengineering/workbench-assets/lang/en.json'
import documentEn from '@hcengineering/document-assets/lang/en.json'
import githubEn from '@hcengineering/github-assets/lang/en.json'

export function registerLoaders (): void {
  addStringsLoader(coreId, async (lang: string) => coreEng)
  addStringsLoader(loginId, async (lang: string) => loginEng)
  addStringsLoader(platformId, async (lang: string) => platformEng)

  addStringsLoader(taskId, async (lang: string) => taskEn)
  addStringsLoader(viewId, async (lang: string) => viewEn)
  addStringsLoader(chunterId, async (lang: string) => chunterEn)
  addStringsLoader(attachmentId, async (lang: string) => attachmentEn)
  addStringsLoader(contactId, async (lang: string) => contactEn)
  addStringsLoader(recruitId, async (lang: string) => recruitEn)
  addStringsLoader(activityId, async (lang: string) => activityEn)
  addStringsLoader(settingId, async (lang: string) => settingEn)
  addStringsLoader(telegramId, async (lang: string) => telegramEn)
  addStringsLoader(leadId, async (lang: string) => leadEn)
  addStringsLoader(gmailId, async (lang: string) => gmailEn)
  addStringsLoader(workbenchId, async (lang: string) => workbenchEn)
  addStringsLoader(inventoryId, async (lang: string) => inventoryEn)
  addStringsLoader(templatesId, async (lang: string) => templatesEn)
  addStringsLoader(notificationId, async (lang: string) => notificationEn)
  addStringsLoader(tagsId, async (lang: string) => tagsEn)
  addStringsLoader(calendarId, async (lang: string) => calendarEn)
  addStringsLoader(trackerId, async (lang: string) => trackerEn)
  addStringsLoader(boardId, async (lang: string) => boardEn)
  addStringsLoader(preferenceId, async (lang: string) => preferenceEn)
  addStringsLoader(hrId, async (lang: string) => hrEn)
  addStringsLoader(documentId, async (lang: string) => documentEn)
  addStringsLoader(bitrixId, async (lang: string) => bitrixEn)
  addStringsLoader(requestId, async (lang: string) => requestEn)
  addStringsLoader(supportId, async (lang: string) => supportEn)
  addStringsLoader(githubId, async (lang: string) => githubEn)
  addStringsLoader(driveId, async (lang: string) => driveEn)
}
