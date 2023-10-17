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

import core, { coreId, Data, PluginConfiguration, Ref, Tx, Version } from '@hcengineering/core'
import jsonVersion from './version.json'

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
import hr, { hrId, createModel as hrModel } from '@hcengineering/model-hr'
import inventory, { inventoryId, createModel as inventoryModel } from '@hcengineering/model-inventory'
import lead, { leadId, createModel as leadModel } from '@hcengineering/model-lead'
import notification, { notificationId, createModel as notificationModel } from '@hcengineering/model-notification'
import { preferenceId, createModel as preferenceModel } from '@hcengineering/model-preference'
import presentation, { presentationId, createModel as presentationModel } from '@hcengineering/model-presentation'
import recruit, { recruitId, createModel as recruitModel } from '@hcengineering/model-recruit'
import { requestId, createModel as requestModel } from '@hcengineering/model-request'
import { serverAttachmentId, createModel as serverAttachmentModel } from '@hcengineering/model-server-attachment'
import { serverCalendarId, createModel as serverCalendarModel } from '@hcengineering/model-server-calendar'
import { serverChunterId, createModel as serverChunterModel } from '@hcengineering/model-server-chunter'
import { serverContactId, createModel as serverContactModel } from '@hcengineering/model-server-contact'
import { serverCoreId, createModel as serverCoreModel } from '@hcengineering/model-server-core'
import { serverGmailId, createModel as serverGmailModel } from '@hcengineering/model-server-gmail'
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
import { serverTrackerId, createModel as serverTrackerModel } from '@hcengineering/model-server-tracker'
import { serverViewId, createModel as serverViewModel } from '@hcengineering/model-server-view'
import setting, { settingId, createModel as settingModel } from '@hcengineering/model-setting'
import { supportId, createModel as supportModel } from '@hcengineering/model-support'
import { tagsId, createModel as tagsModel } from '@hcengineering/model-tags'
import { taskId, createModel as taskModel } from '@hcengineering/model-task'
import telegram, { telegramId, createModel as telegramModel } from '@hcengineering/model-telegram'
import { templatesId, createModel as templatesModel } from '@hcengineering/model-templates'
import { textEditorId, createModel as textEditorModel } from '@hcengineering/model-text-editor'
import tracker, { trackerId, createModel as trackerModel } from '@hcengineering/model-tracker'
import view, { viewId, createModel as viewModel } from '@hcengineering/model-view'
import workbench, { workbenchId, createModel as workbenchModel } from '@hcengineering/model-workbench'

import { openAIId, createModel as serverOpenAI } from '@hcengineering/model-server-openai'
import { createModel as serverTranslate, translateId } from '@hcengineering/model-server-translate'

import { Plugin } from '@hcengineering/platform'

export const version: Data<Version> = jsonVersion as Data<Version>

interface ConfigurablePlugin extends Omit<Data<PluginConfiguration>, 'pluginId' | 'transactions'> {}

type BuilderConfig = [(b: Builder) => void, Plugin] | [(b: Builder) => void, Plugin, ConfigurablePlugin | undefined]

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
    presentation.class.ObjectSearchCategory,
    notification.class.NotificationGroup,
    view.class.Action,
    contact.class.ChannelProvider,
    setting.class.IntegrationType
  ]

  const builders: BuilderConfig[] = [
    [coreModel, coreId],
    [activityModel, activityId],
    [attachmentModel, attachmentId],
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
        enabled: false,
        beta: true,
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
        enabled: false,
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
    [notificationModel, notificationId],
    [preferenceModel, preferenceId],
    [
      hrModel,
      hrId,
      {
        label: hr.string.ConfigLabel,
        description: hr.string.ConfigDescription,
        enabled: false,
        beta: true,
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
        beta: true,
        classFilter: defaultFilter
      }
    ],
    [supportModel, supportId],

    [serverCoreModel, serverCoreId],
    [serverAttachmentModel, serverAttachmentId],
    [serverContactModel, serverContactId],
    [serveSettingModel, serverSettingId],
    [serverChunterModel, serverChunterId],
    [serverInventoryModel, serverInventoryId],
    [serverLeadModel, serverLeadId],
    [serverTagsModel, serverTagsId],
    [serverTaskModel, serverTaskId],
    [serverTrackerModel, serverTrackerId],
    [serverCalendarModel, serverCalendarId],
    [serverRecruitModel, serverRecruitId],
    [serverGmailModel, serverGmailId],
    [serverTelegramModel, serverTelegramId],
    [serverHrModel, serverHrId],
    [serverNotificationModel, serverNotificationId],
    [serverRequestModel, serverRequestId],
    [serverViewModel, serverViewId],

    [serverTranslate, translateId],
    [serverOpenAI, openAIId]
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

  builder.createDoc(core.class.Version, core.space.Model, version, core.version.Model)
  return builder
}

// Export upgrade procedures
export { migrateOperations } from './migration'
