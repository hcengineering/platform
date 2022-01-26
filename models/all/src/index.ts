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
import { createModel as serverCoreModel } from '@anticrm/model-server-core'
import { createModel as settingModel } from '@anticrm/model-setting'
import { createModel as taskModel } from '@anticrm/model-task'
import { createModel as telegramModel } from '@anticrm/model-telegram'
import { createModel as templatesModel } from '@anticrm/model-templates'
import { createModel as textEditorModel } from '@anticrm/model-text-editor'
import { createModel as viewModel } from '@anticrm/model-view'
import { createModel as workbenchModel } from '@anticrm/model-workbench'
import { readFileSync } from 'fs'
import { join } from 'path'

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

  serverCoreModel,
  serverAttachmentModel,
  serverContactModel,

  createDemo
]

for (const b of builders) {
  b(builder)
}
const packageFile = readFileSync(join(__dirname, '..', 'package.json')).toString()
const json = JSON.parse(packageFile)
const packageVersion = json.version.split('.')

export const version: Data<Version> = {
  major: parseInt(packageVersion[0]),
  minor: parseInt(packageVersion[1]),
  patch: parseInt(packageVersion[2])
}

builder.createDoc(core.class.Version, core.space.Model, version, core.version.Model)
export default builder

// Export upgrade procedures
export { createDeps } from './creation'
export { migrateOperations } from './migration'
