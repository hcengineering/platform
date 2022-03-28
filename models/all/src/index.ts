//
// Copyright © 2020 Anticrm Platform Contributors.
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

import core, { Data, Version } from '@anticrm/core'
import jsonVersion from './version.json'

import { Builder } from '@anticrm/model'
import { createModel as activityModel } from '@anticrm/model-activity'
import { createModel as attachmentModel } from '@anticrm/model-attachment'
import { createModel as chunterModel } from '@anticrm/model-chunter'
import { createModel as contactModel } from '@anticrm/model-contact'
import { createModel as coreModel } from '@anticrm/model-core'
import { createDemo } from '@anticrm/model-demo'
import { createModel as gmailModel } from '@anticrm/model-gmail'
import { createModel as inventoryModel } from '@anticrm/model-inventory'
import { createModel as leadModel } from '@anticrm/model-lead'
import { createModel as presentationModel } from '@anticrm/model-presentation'
import { createModel as recruitModel } from '@anticrm/model-recruit'
import { createModel as serverAttachmentModel } from '@anticrm/model-server-attachment'
import { createModel as serverContactModel } from '@anticrm/model-server-contact'
import { createModel as serverNotificationModel } from '@anticrm/model-server-notification'
import { createModel as serverChunterModel } from '@anticrm/model-server-chunter'
import { createModel as serverInventoryModel } from '@anticrm/model-server-inventory'
import { createModel as serverLeadModel } from '@anticrm/model-server-lead'
import { createModel as serverTaskModel } from '@anticrm/model-server-task'
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

export const version: Data<Version> = jsonVersion as Data<Version>

const builder = new Builder()

const builders = [
  coreModel,
  activityModel,
  attachmentModel,
  viewModel,
  workbenchModel,
  contactModel,
  chunterModel,
  taskModel,
  recruitModel,
  settingModel,
  telegramModel,
  leadModel,
  gmailModel,
  inventoryModel,
  presentationModel,
  templatesModel,
  textEditorModel,
  notificationModel,
  serverCoreModel,
  serverAttachmentModel,
  serverContactModel,
  serverNotificationModel,
  serveSettingModel,
  tagsModel,
  calendarModel,
  serverChunterModel,
  serverInventoryModel,
  serverLeadModel,
  serverTagsModel,
  serverTaskModel,
  serverRecruitModel,
  serverCalendarModel,
  serverGmailModel,
  serverTelegramModel,
  createDemo
]

for (const b of builders) {
  b(builder)
}

builder.createDoc(core.class.Version, core.space.Model, version, core.version.Model)
export default builder

// Export upgrade procedures
export { createDeps } from './creation'
export { migrateOperations } from './migration'
