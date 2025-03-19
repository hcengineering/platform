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

import core, { coreId, type Data, type PluginConfiguration, type Ref, type Tx, type Version } from '@hcengineering/core'

import { Builder } from '@hcengineering/model'
import { activityId, createModel as activityModel } from '@hcengineering/model-activity'
import { attachmentId, createModel as attachmentModel } from '@hcengineering/model-attachment'
import bitrix, { bitrixId, createModel as bitrixModel } from '@hcengineering/model-bitrix'
import board, { boardId, createModel as boardModel } from '@hcengineering/model-board'
import calendar, { calendarId, createModel as calendarModel } from '@hcengineering/model-calendar'
import chunter, { chunterId, createModel as chunterModel } from '@hcengineering/model-chunter'
import contact, { contactId, createModel as contactModel } from '@hcengineering/model-contact'
import { createModel as coreModel } from '@hcengineering/model-core'
import gmail, { gmailId, createModel as gmailModel } from '@hcengineering/model-gmail'
import { guestId, createModel as guestModel } from '@hcengineering/model-guest'
import hr, { hrId, createModel as hrModel } from '@hcengineering/model-hr'
import inventory, { inventoryId, createModel as inventoryModel } from '@hcengineering/model-inventory'
import lead, { leadId, createModel as leadModel } from '@hcengineering/model-lead'
import notification, { notificationId, createModel as notificationModel } from '@hcengineering/model-notification'
import { preferenceId, createModel as preferenceModel } from '@hcengineering/model-preference'
import presentation, { presentationId, createModel as presentationModel } from '@hcengineering/model-presentation'
import recruit, { recruitId, createModel as recruitModel } from '@hcengineering/model-recruit'
import { requestId, createModel as requestModel } from '@hcengineering/model-request'
import { aiBotId, createModel as aiBotModel } from '@hcengineering/model-ai-bot'
import { serverActivityId, createModel as serverActivityModel } from '@hcengineering/model-server-activity'
import { serverAttachmentId, createModel as serverAttachmentModel } from '@hcengineering/model-server-attachment'
import { serverCardId, createModel as serverCardModel } from '@hcengineering/model-server-card'
import { serverCalendarId, createModel as serverCalendarModel } from '@hcengineering/model-server-calendar'
import { serverChunterId, createModel as serverChunterModel } from '@hcengineering/model-server-chunter'
import {
  serverCollaborationId,
  createModel as serverCollaborationModel
} from '@hcengineering/model-server-collaboration'
import { serverContactId, createModel as serverContactModel } from '@hcengineering/model-server-contact'
import { serverCoreId, createModel as serverCoreModel } from '@hcengineering/model-server-core'
import { serverDriveId, createModel as serverDriveModel } from '@hcengineering/model-server-drive'
import { serverGmailId, createModel as serverGmailModel } from '@hcengineering/model-server-gmail'
import { serverGuestId, createModel as serverGuestModel } from '@hcengineering/model-server-guest'
import { serverHrId, createModel as serverHrModel } from '@hcengineering/model-server-hr'
import { serverInventoryId, createModel as serverInventoryModel } from '@hcengineering/model-server-inventory'
import { serverLeadId, createModel as serverLeadModel } from '@hcengineering/model-server-lead'
import { serverNotificationId, createModel as serverNotificationModel } from '@hcengineering/model-server-notification'
import { serverRecruitId, createModel as serverRecruitModel } from '@hcengineering/model-server-recruit'
import { serverRequestId, createModel as serverRequestModel } from '@hcengineering/model-server-request'
import { serverSettingId, createModel as serveSettingModel } from '@hcengineering/model-server-setting'
import { serverTagsId, createModel as serverTagsModel } from '@hcengineering/model-server-tags'
import { serverTaskId, createModel as serverTaskModel } from '@hcengineering/model-server-task'
import { serverTelegramId, createModel as serverTelegramModel } from '@hcengineering/model-server-telegram'
import { serverTemplatesId, createModel as serverTemplatesModel } from '@hcengineering/model-server-templates'
import { serverTrackerId, createModel as serverTrackerModel } from '@hcengineering/model-server-tracker'
import { serverViewId, createModel as serverViewModel } from '@hcengineering/model-server-view'
import { serverAiBotId, createModel as serverAiBotModel } from '@hcengineering/model-server-ai-bot'
import setting, { settingId, createModel as settingModel } from '@hcengineering/model-setting'
import { driveId, createModel as driveModel } from '@hcengineering/model-drive'
import { supportId, createModel as supportModel } from '@hcengineering/model-support'
import { tagsId, createModel as tagsModel } from '@hcengineering/model-tags'
import { taskId, createModel as taskModel } from '@hcengineering/model-task'
import telegram, { telegramId, createModel as telegramModel } from '@hcengineering/model-telegram'
import { templatesId, createModel as templatesModel } from '@hcengineering/model-templates'
import { textEditorId, createModel as textEditorModel } from '@hcengineering/model-text-editor'
import { timeId, createModel as timeModel } from '@hcengineering/model-time'
import tracker, { trackerId, createModel as trackerModel } from '@hcengineering/model-tracker'
import { uploaderId, createModel as uploaderModel } from '@hcengineering/model-uploader'
import { recorderId, createModel as recorderModel } from '@hcengineering/model-recorder'
import view, { viewId, createModel as viewModel } from '@hcengineering/model-view'
import workbench, { workbenchId, createModel as workbenchModel } from '@hcengineering/model-workbench'
import card, { cardId, createModel as cardModel } from '@hcengineering/model-card'
import { desktopPreferencesId, createModel as desktopPreferencesModel } from '@hcengineering/model-desktop-preferences'

import document, { documentId, createModel as documentModel } from '@hcengineering/model-document'
import { serverDocumentId, createModel as serverDocumentModel } from '@hcengineering/model-server-document'

import github, { githubId, createModel as githubModel } from '@hcengineering/model-github'
import { serverGithubId, createModel as serverGithubModel } from '@hcengineering/server-github-model'

import { serverTimeId, createModel as serverTimeModel } from '@hcengineering/model-server-time'
import love, { loveId, createModel as loveModel } from '@hcengineering/model-love'
import { printId, createModel as printModel } from '@hcengineering/model-print'
import { analyticsCollectorId, createModel as analyticsCollectorModel } from '@hcengineering/model-analytics-collector'
import { serverLoveId, createModel as serverLoveModel } from '@hcengineering/model-server-love'
import { serverProcessId, createModel as serverProcessModel } from '@hcengineering/model-server-process'

import { questionsId, createModel as questionsModel } from '@hcengineering/model-questions'
import trainings, { trainingId, createModel as trainingModel } from '@hcengineering/model-training'
import documents, { documentsId, createModel as documentsModel } from '@hcengineering/model-controlled-documents'
import products, { productsId, createModel as productsModel } from '@hcengineering/model-products'
import { serverProductsId, createModel as serverProductsModel } from '@hcengineering/model-server-products'
import { serverTrainingId, createModel as serverTrainingModel } from '@hcengineering/model-server-training'
import testManagement, {
  testManagementId,
  createModel as testManagementModel
} from '@hcengineering/model-test-management'
import mySpace, { mySpaceId, createModel as mySpaceModel } from '@hcengineering/model-my-space'
import { mailId, createModel as mailModel } from '@hcengineering/model-mail'

import {
  serverDocumentsId,
  createModel as serverDocumentsModel
} from '@hcengineering/model-server-controlled-documents'
import { serverFulltextId, createModel as serverFulltextModel } from '@hcengineering/model-server-fulltext'
import { surveyId, createModel as surveyModel } from '@hcengineering/model-survey'
import { presenceId, createModel as presenceModel } from '@hcengineering/model-presence'
import processes, { processId, createModel as processModel } from '@hcengineering/model-process'

import { type Plugin } from '@hcengineering/platform'

interface ConfigurablePlugin extends Omit<Data<PluginConfiguration>, 'pluginId' | 'transactions'> {}

type BuilderConfig = [(b: Builder) => void, Plugin] | [(b: Builder) => void, Plugin, ConfigurablePlugin | undefined]

export function getModelVersion (): Data<Version> {
  const rawVersion = (process.env.MODEL_VERSION ?? '0.6.0').replace('"', '').trim().replace('v', '').split('.')
  if (rawVersion.length === 3) {
    return {
      major: parseInt(rawVersion[0]),
      minor: parseInt(rawVersion[1]),
      patch: parseInt(rawVersion[2])
    }
  }
  return { major: 0, minor: 6, patch: 0 }
}

export type { MigrateOperation } from '@hcengineering/model'

/**
 * @public
 * @param enabled - a set of enabled plugins
 * @param disabled  - a set of disabled plugins
 * @returns
 */
export default function buildModel (enabled: string[] = ['*'], disabled: string[] = []): Builder {
  const builder = new Builder()

  const defaultFilter = [
    workbench.class.Application,
    presentation.class.ComponentPointExtension,
    presentation.class.ObjectSearchCategory,
    notification.class.NotificationGroup,
    view.class.Action,
    contact.class.ChannelProvider,
    setting.class.IntegrationType,
    setting.class.WorkspaceSettingCategory,
    setting.class.SettingsCategory
  ]

  const builders: BuilderConfig[] = [
    [coreModel, coreId],
    [activityModel, activityId],
    [attachmentModel, attachmentId],
    [guestModel, guestId],
    [tagsModel, tagsId],
    [viewModel, viewId],
    [workbenchModel, workbenchId],
    [
      contactModel,
      contactId,
      {
        label: contact.string.ConfigLabel,
        description: contact.string.ConfigDescription,
        enabled: true,
        beta: false,
        icon: contact.icon.ContactApplication,
        classFilter: defaultFilter
      }
    ],
    [
      chunterModel,
      chunterId,
      {
        label: chunter.string.ConfigLabel,
        description: chunter.string.ConfigDescription,
        enabled: true,
        beta: false,
        icon: chunter.icon.Chunter,
        classFilter: [workbench.class.Application]
      }
    ],
    [taskModel, taskId],
    [
      calendarModel,
      calendarId,
      {
        label: calendar.string.ConfigLabel,
        description: calendar.string.ConfigDescription,
        enabled: true,
        beta: true,
        icon: calendar.icon.Calendar,
        classFilter: defaultFilter
      }
    ],
    [
      recruitModel,
      recruitId,
      {
        label: recruit.string.ConfigLabel,
        description: recruit.string.ConfigDescription,
        enabled: true,
        beta: false,
        icon: recruit.icon.RecruitApplication,
        classFilter: defaultFilter
      }
    ],
    [settingModel, settingId],
    [
      telegramModel,
      telegramId,
      {
        label: telegram.string.ConfigLabel,
        description: telegram.string.ConfigDescription,
        enabled: true,
        beta: false,
        classFilter: defaultFilter
      }
    ],
    [
      leadModel,
      leadId,
      {
        label: lead.string.ConfigLabel,
        description: lead.string.ConfigDescription,
        enabled: false,
        beta: true,
        icon: lead.icon.LeadApplication,
        classFilter: defaultFilter
      }
    ],
    [
      gmailModel,
      gmailId,
      {
        label: gmail.string.ConfigLabel,
        description: gmail.string.ConfigDescription,
        enabled: true,
        beta: false,
        classFilter: defaultFilter
      }
    ],
    [
      inventoryModel,
      inventoryId,
      {
        label: inventory.string.ConfigLabel,
        description: inventory.string.ConfigDescription,
        enabled: false,
        beta: true,
        icon: inventory.icon.InventoryApplication,
        classFilter: defaultFilter
      }
    ],
    [presentationModel, presentationId],
    [templatesModel, templatesId],
    [textEditorModel, textEditorId],
    [uploaderModel, uploaderId],
    [recorderModel, recorderId],
    [notificationModel, notificationId],
    [preferenceModel, preferenceId],
    [analyticsCollectorModel, analyticsCollectorId],
    [
      hrModel,
      hrId,
      {
        label: hr.string.ConfigLabel,
        description: hr.string.ConfigDescription,
        enabled: true,
        beta: false,
        icon: hr.icon.Structure,
        classFilter: defaultFilter
      }
    ],
    [
      trackerModel,
      trackerId,
      {
        label: tracker.string.ConfigLabel,
        description: tracker.string.ConfigDescription,
        enabled: true,
        beta: false,
        icon: tracker.icon.TrackerApplication,
        classFilter: defaultFilter
      }
    ],
    [
      documentModel,
      documentId,
      {
        label: document.string.ConfigLabel,
        description: document.string.ConfigDescription,
        enabled: true,
        beta: false,
        icon: document.icon.DocumentApplication,
        classFilter: defaultFilter
      }
    ],
    [
      boardModel,
      boardId,
      {
        label: board.string.ConfigLabel,
        description: board.string.ConfigDescription,
        enabled: false,
        beta: true,
        icon: board.icon.Board,
        classFilter: defaultFilter
      }
    ],
    [
      bitrixModel,
      bitrixId,
      {
        label: bitrix.string.ConfigLabel,
        description: bitrix.string.ConfigDescription,
        enabled: false,
        beta: true,
        icon: bitrix.icon.Bitrix,
        classFilter: defaultFilter
      }
    ],
    [
      requestModel,
      requestId,
      {
        // label: request.string.ConfigLabel,
        // description: request.string.ConfigDescription,
        enabled: false,
        beta: false,
        classFilter: defaultFilter
      }
    ],
    [timeModel, timeId],
    [supportModel, supportId],
    [desktopPreferencesModel, desktopPreferencesId],

    [
      githubModel,
      githubId,
      {
        label: github.string.ConfigLabel,
        description: github.string.ConfigDescription,
        enabled: true,
        beta: false,
        icon: github.icon.Github
      }
    ],
    [
      loveModel,
      loveId,
      {
        label: love.string.Office,
        description: love.string.LoveDescription,
        enabled: true,
        beta: true,
        icon: love.icon.Love,
        classFilter: defaultFilter
      }
    ],
    [printModel, printId],
    [aiBotModel, aiBotId],
    [
      cardModel,
      cardId,
      {
        label: card.string.Cards,
        description: card.string.ConfigDescription,
        enabled: true,
        beta: true,
        icon: card.icon.Card,
        classFilter: defaultFilter
      }
    ],
    [
      processModel,
      processId,
      {
        label: processes.string.ConfigLabel,
        description: processes.string.ConfigDescription,
        enabled: true,
        beta: true,
        icon: processes.icon.Process,
        classFilter: defaultFilter
      }
    ],
    [driveModel, driveId],
    [
      documentsModel,
      documentsId,
      {
        label: documents.string.ConfigLabel,
        description: documents.string.ConfigDescription,
        enabled: false,
        beta: false,
        classFilter: defaultFilter
      }
    ],
    [
      questionsModel,
      questionsId,
      {
        enabled: false,
        beta: false,
        classFilter: defaultFilter
      }
    ],
    [
      trainingModel,
      trainingId,
      {
        label: trainings.string.ConfigLabel,
        description: trainings.string.ConfigDescription,
        enabled: false,
        beta: false,
        classFilter: defaultFilter
      }
    ],
    [
      productsModel,
      productsId,
      {
        label: products.string.ConfigLabel,
        description: products.string.ConfigDescription,
        enabled: false,
        beta: false,
        classFilter: defaultFilter
      }
    ],
    [
      testManagementModel,
      testManagementId,
      {
        label: testManagement.string.ConfigLabel,
        description: testManagement.string.ConfigDescription,
        enabled: true,
        beta: true,
        classFilter: defaultFilter
      }
    ],
    [surveyModel, surveyId],
    [presenceModel, presenceId],
    [
      mySpaceModel,
      mySpaceId,
      {
        label: mySpace.string.ConfigLabel,
        description: mySpace.string.ConfigDescription,
        enabled: false,
        beta: true,
        classFilter: defaultFilter
      }
    ],
    [mailModel, mailId],

    [serverCoreModel, serverCoreId],
    [serverAttachmentModel, serverAttachmentId],
    [serverCollaborationModel, serverCollaborationId],
    [serverContactModel, serverContactId],
    [serveSettingModel, serverSettingId],
    [serverChunterModel, serverChunterId],
    [serverInventoryModel, serverInventoryId],
    [serverLeadModel, serverLeadId],
    [serverTagsModel, serverTagsId],
    [serverTaskModel, serverTaskId],
    [serverTrackerModel, serverTrackerId],
    [serverCardModel, serverCardId],
    [serverCalendarModel, serverCalendarId],
    [serverRecruitModel, serverRecruitId],
    [serverGmailModel, serverGmailId],
    [serverTemplatesModel, serverTemplatesId],
    [serverTelegramModel, serverTelegramId],
    [serverHrModel, serverHrId],
    [serverNotificationModel, serverNotificationId],
    [serverRequestModel, serverRequestId],
    [serverViewModel, serverViewId],
    [serverActivityModel, serverActivityId],
    [serverDocumentModel, serverDocumentId],
    [serverGithubModel, serverGithubId],
    [serverLoveModel, serverLoveId],
    [serverTimeModel, serverTimeId],
    [serverGuestModel, serverGuestId],
    [serverDriveModel, serverDriveId],
    [serverProductsModel, serverProductsId],
    [serverTrainingModel, serverTrainingId],
    [serverDocumentsModel, serverDocumentsId],
    [serverAiBotModel, serverAiBotId],
    [serverFulltextModel, serverFulltextId],
    [serverProcessModel, serverProcessId]
  ]

  for (const [b, id, config] of builders) {
    const txes: Tx[] = []
    builder.onTx = (tx) => {
      txes.push(tx)
    }
    b(builder)
    builder.createDoc(
      core.class.PluginConfiguration,
      core.space.Model,
      {
        pluginId: id,
        transactions: txes.map((it) => it._id),
        ...config,
        enabled:
          config?.label === undefined ||
          ((config?.enabled ?? true) && (enabled.includes(id) || enabled.includes('*')) && !disabled.includes(id)),
        beta: config?.beta ?? false
      },
      ('plugin-configuration-' + id) as Ref<PluginConfiguration>
    )
    builder.onTx = undefined
  }

  builder.createDoc(core.class.Version, core.space.Model, getModelVersion(), core.version.Model)
  return builder
}

// Export upgrade procedures
export { migrateOperations } from './migration'
