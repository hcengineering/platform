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
import { createModel as activityModel } from '@hcengineering/model-activity'
import { createModel as attachmentModel } from '@hcengineering/model-attachment'
import { createModel as automationModel } from '@hcengineering/model-automation'
import { createModel as chunterModel } from '@hcengineering/model-chunter'
import { createModel as contactModel } from '@hcengineering/model-contact'
import { createModel as coreModel } from '@hcengineering/model-core'
import { createModel as gmailModel } from '@hcengineering/model-gmail'
import { createModel as inventoryModel } from '@hcengineering/model-inventory'
import { createModel as leadModel } from '@hcengineering/model-lead'
import { createModel as presentationModel } from '@hcengineering/model-presentation'
import { createModel as recruitModel } from '@hcengineering/model-recruit'
import { createModel as serverAttachmentModel } from '@hcengineering/model-server-attachment'
import { createModel as serverContactModel } from '@hcengineering/model-server-contact'
import { createModel as serverNotificationModel } from '@hcengineering/model-server-notification'
import { createModel as serverChunterModel } from '@hcengineering/model-server-chunter'
import { createModel as serverInventoryModel } from '@hcengineering/model-server-inventory'
import { createModel as serverLeadModel } from '@hcengineering/model-server-lead'
import { createModel as serverTaskModel } from '@hcengineering/model-server-task'
import { createModel as serverTrackerModel } from '@hcengineering/model-server-tracker'
import { createModel as serverTagsModel } from '@hcengineering/model-server-tags'
import { createModel as serveSettingModel } from '@hcengineering/model-server-setting'
import { createModel as serverRecruitModel } from '@hcengineering/model-server-recruit'
import { createModel as serverCoreModel } from '@hcengineering/model-server-core'
import { createModel as settingModel } from '@hcengineering/model-setting'
import { createModel as taskModel } from '@hcengineering/model-task'
import { createModel as telegramModel } from '@hcengineering/model-telegram'
import { createModel as templatesModel } from '@hcengineering/model-templates'
import { createModel as textEditorModel } from '@hcengineering/model-text-editor'
import { createModel as viewModel } from '@hcengineering/model-view'
import { createModel as workbenchModel } from '@hcengineering/model-workbench'
import { createModel as notificationModel } from '@hcengineering/model-notification'
import { createModel as tagsModel } from '@hcengineering/model-tags'
import { createModel as calendarModel } from '@hcengineering/model-calendar'
import { createModel as serverCalendarModel } from '@hcengineering/model-server-calendar'
import { createModel as serverGmailModel } from '@hcengineering/model-server-gmail'
import { createModel as serverTelegramModel } from '@hcengineering/model-server-telegram'
import { createModel as trackerModel } from '@hcengineering/model-tracker'
import { createModel as boardModel } from '@hcengineering/model-board'
import { createModel as preferenceModel } from '@hcengineering/model-preference'
import { createModel as hrModel } from '@hcengineering/model-hr'
import { createModel as serverHrModel } from '@hcengineering/model-server-hr'
import { createModel as documentModel } from '@hcengineering/model-document'
import { createModel as bitrixModel } from '@hcengineering/model-bitrix'
import { createModel as requestModel } from '@hcengineering/model-request'
import { createModel as serverRequestModel } from '@hcengineering/model-server-request'

import { createModel as serverTranslate } from '@hcengineering/model-server-translate'
import { createModel as serverOpenAI } from '@hcengineering/model-server-openai'

export const version: Data<Version> = jsonVersion as Data<Version>

const builder = new Builder()

const builders: [(b: Builder) => void, string][] = [
  [coreModel, coreId],
  [activityModel, 'activity'],
  [attachmentModel, 'attachment'],
  [tagsModel, 'tags'],
  [viewModel, 'view'],
  [workbenchModel, 'workbench'],
  [contactModel, 'contact'],
  [chunterModel, 'chunter'],
  [taskModel, 'task'],
  [recruitModel, 'recruit'],
  [settingModel, 'setting'],
  [telegramModel, 'telegram'],
  [leadModel, 'lead'],
  [gmailModel, 'gmail'],
  [inventoryModel, 'inventory'],
  [presentationModel, 'presentation'],
  [templatesModel, 'templates'],
  [textEditorModel, 'text-editor'],
  [notificationModel, 'notification'],
  [preferenceModel, 'preference'],
  [hrModel, 'hr'],
  [documentModel, 'document'],
  [trackerModel, 'tracker'],
  [boardModel, 'board'],
  [calendarModel, 'calendar'],
  [bitrixModel, 'bitrix'],
  [requestModel, 'request'],

  [serverCoreModel, 'server-core'],
  [serverAttachmentModel, 'server-attachment'],
  [serverContactModel, 'server-contact'],
  [serveSettingModel, 'server-setting'],
  [serverChunterModel, 'server-chunter'],
  [serverInventoryModel, 'server-inventory'],
  [serverLeadModel, 'server-lead'],
  [serverTagsModel, 'server-tags'],
  [serverTaskModel, 'server-task'],
  [serverTrackerModel, 'server-tracker'],
  [serverRecruitModel, 'server-recruit'],
  [serverCalendarModel, 'server-calendar'],
  [serverGmailModel, 'server-gmail'],
  [serverTelegramModel, 'server-telegram'],
  [serverHrModel, 'server-hr'],
  [serverNotificationModel, 'server-notification'],
  [serverRequestModel, 'server-request'],
  [automationModel, 'automation'],
  [serverTranslate, 'translate'],
  [serverOpenAI, 'openai']
]

for (const [b, id] of builders) {
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
      transactions: txes.map((it) => it._id)
    },
    ('plugin-configuration-' + id) as Ref<PluginConfiguration>
  )
  builder.onTx = undefined
}

builder.createDoc(core.class.Version, core.space.Model, version, core.version.Model)
export default builder

// Export upgrade procedures
export { migrateOperations } from './migration'
