import { addLocation } from '@hcengineering/platform'
import { serverActivityId } from '@hcengineering/server-activity'
import { serverAttachmentId } from '@hcengineering/server-attachment'
import { serverCardId } from '@hcengineering/server-card'
import { serverCalendarId } from '@hcengineering/server-calendar'
import { serverChunterId } from '@hcengineering/server-chunter'
import { serverCollaborationId } from '@hcengineering/server-collaboration'
import { serverContactId } from '@hcengineering/server-contact'
import { serverDocumentsId } from '@hcengineering/server-controlled-documents'
import { serverDocumentId } from '@hcengineering/server-document'
import { serverDriveId } from '@hcengineering/server-drive'
import { serverGithubId } from '@hcengineering/server-github'
import { serverGmailId } from '@hcengineering/server-gmail'
import { serverGuestId } from '@hcengineering/server-guest'
import { serverHrId } from '@hcengineering/server-hr'
import { serverInventoryId } from '@hcengineering/server-inventory'
import { serverLeadId } from '@hcengineering/server-lead'
import { serverLoveId } from '@hcengineering/server-love'
import { serverNotificationId } from '@hcengineering/server-notification'
import { serverRecruitId } from '@hcengineering/server-recruit'
import { serverRequestId } from '@hcengineering/server-request'
import { serverSettingId } from '@hcengineering/server-setting'
import { serverTagsId } from '@hcengineering/server-tags'
import { serverTaskId } from '@hcengineering/server-task'
import { serverTelegramId } from '@hcengineering/server-telegram'
import { serverTimeId } from '@hcengineering/server-time'
import { serverTrackerId } from '@hcengineering/server-tracker'
import { serverTrainingId } from '@hcengineering/server-training'
import { serverViewId } from '@hcengineering/server-view'
import { serverAiBotId } from '@hcengineering/server-ai-bot'
import { serverFulltextId } from '@hcengineering/server-fulltext'

export function registerServerPlugins (): void {
  addLocation(serverActivityId, () => import('@hcengineering/server-activity-resources'))
  addLocation(serverAttachmentId, () => import('@hcengineering/server-attachment-resources'))
  addLocation(serverCollaborationId, () => import('@hcengineering/server-collaboration-resources'))
  addLocation(serverContactId, () => import('@hcengineering/server-contact-resources'))
  addLocation(serverNotificationId, () => import('@hcengineering/server-notification-resources'))
  addLocation(serverSettingId, () => import('@hcengineering/server-setting-resources'))
  addLocation(serverChunterId, () => import('@hcengineering/server-chunter-resources'))
  addLocation(serverInventoryId, () => import('@hcengineering/server-inventory-resources'))
  addLocation(serverLeadId, () => import('@hcengineering/server-lead-resources'))
  addLocation(serverRecruitId, () => import('@hcengineering/server-recruit-resources'))
  addLocation(serverTaskId, () => import('@hcengineering/server-task-resources'))
  addLocation(serverTrackerId, () => import('@hcengineering/server-tracker-resources'))
  addLocation(serverTagsId, () => import('@hcengineering/server-tags-resources'))
  addLocation(serverCardId, () => import('@hcengineering/server-card-resources'))
  addLocation(serverCalendarId, () => import('@hcengineering/server-calendar-resources'))
  addLocation(serverGmailId, () => import('@hcengineering/server-gmail-resources'))
  addLocation(serverTelegramId, () => import('@hcengineering/server-telegram-resources'))
  addLocation(serverRequestId, () => import('@hcengineering/server-request-resources'))
  addLocation(serverViewId, () => import('@hcengineering/server-view-resources'))
  addLocation(serverHrId, () => import('@hcengineering/server-hr-resources'))
  addLocation(serverLoveId, () => import('@hcengineering/server-love-resources'))
  addLocation(serverGuestId, () => import('@hcengineering/server-guest-resources'))
  addLocation(serverDocumentId, () => import('@hcengineering/server-document-resources'))
  addLocation(serverTimeId, () => import('@hcengineering/server-time-resources'))
  addLocation(serverDriveId, () => import('@hcengineering/server-drive-resources'))
  addLocation(serverDocumentsId, () => import('@hcengineering/server-controlled-documents-resources'))
  addLocation(serverTrainingId, () => import('@hcengineering/server-training-resources'))
  addLocation(serverGithubId, () => import('@hcengineering/server-github-resources'))
  addLocation(serverAiBotId, () => import('@hcengineering/server-ai-bot-resources'))
  addLocation(serverFulltextId, () => import('@hcengineering/server-fulltext-resources'))
}
