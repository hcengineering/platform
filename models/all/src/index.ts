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

import core, { coreId, Data, PluginConfiguration, Ref, Tx, Version } from '@anticrm/core'
import jsonVersion from './version.json'

import { Builder } from '@anticrm/model'
import { createModel as activityModel } from '@anticrm/model-activity'
import { createModel as attachmentModel } from '@anticrm/model-attachment'
import { createModel as chunterModel } from '@anticrm/model-chunter'
import { createModel as contactModel } from '@anticrm/model-contact'
import { createModel as coreModel } from '@anticrm/model-core'
import { createModel as gmailModel } from '@anticrm/model-gmail'
import { createModel as inventoryModel } from '@anticrm/model-inventory'
import { createModel as leadModel } from '@anticrm/model-lead'
import { createModel as presentationModel } from '@anticrm/model-presentation'
import { createModel as recruitModel } from '@anticrm/model-recruit'
import { createModel as serverAttachmentModel } from '@anticrm/model-server-attachment'
import { createModel as serverBoardModel } from '@anticrm/model-server-board'
import { createModel as serverContactModel } from '@anticrm/model-server-contact'
import { createModel as serverNotificationModel } from '@anticrm/model-server-notification'
import { createModel as serverChunterModel } from '@anticrm/model-server-chunter'
import { createModel as serverInventoryModel } from '@anticrm/model-server-inventory'
import { createModel as serverLeadModel } from '@anticrm/model-server-lead'
import { createModel as serverTaskModel } from '@anticrm/model-server-task'
import { createModel as serverTrackerModel } from '@anticrm/model-server-tracker'
import { createModel as serverTagsModel } from '@anticrm/model-server-tags'
import { createModel as serveSettingModel } from '@anticrm/model-server-setting'
import { createModel as serverRecruitModel } from '@anticrm/model-server-recruit'
import { createModel as serverCoreModel } from '@anticrm/model-server-core'
import { createModel as settingModel } from '@anticrm/model-setting'
import { createModel as taskModel } from '@anticrm/model-task'
import { createModel as telegramModel } from '@anticrm/model-telegram'
import { createModel as templatesModel } from '@anticrm/model-templates'
import { createModel as textEditorModel } from '@anticrm/model-text-editor'
import { createModel as viewModel } from '@anticrm/model-view'
import { createModel as workbenchModel } from '@anticrm/model-workbench'
import { createModel as notificationModel } from '@anticrm/model-notification'
import { createModel as tagsModel } from '@anticrm/model-tags'
import { createModel as calendarModel } from '@anticrm/model-calendar'
import { createModel as serverCalendarModel } from '@anticrm/model-server-calendar'
import { createModel as serverGmailModel } from '@anticrm/model-server-gmail'
import { createModel as serverTelegramModel } from '@anticrm/model-server-telegram'
import { createModel as trackerModel } from '@anticrm/model-tracker'
import { createModel as boardModel } from '@anticrm/model-board'
import { createModel as preferenceModel } from '@anticrm/model-preference'
import { createModel as hrModel } from '@anticrm/model-hr'
import { createModel as serverHrModel } from '@anticrm/model-server-hr'

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

  [serverCoreModel, 'server-core'],
  [serverAttachmentModel, 'server-attachment'],
  [serverBoardModel, 'server-board'],
  [serverContactModel, 'server-contact'],
  [serverNotificationModel, 'server-notification'],
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
  [trackerModel, 'tracker'],
  [boardModel, 'board'],
  [calendarModel, 'calendar']
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
