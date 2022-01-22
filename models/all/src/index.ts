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

import { Builder } from '@anticrm/model'

import { createModel as coreModel } from '@anticrm/model-core'
import { createModel as viewModel } from '@anticrm/model-view'
import { createModel as workbenchModel } from '@anticrm/model-workbench'
import { createModel as contactModel } from '@anticrm/model-contact'
import { createModel as taskModel } from '@anticrm/model-task'
import { createModel as chunterModel } from '@anticrm/model-chunter'
import { createModel as recruitModel } from '@anticrm/model-recruit'
import { createModel as settingModel } from '@anticrm/model-setting'
import { createModel as telegramModel } from '@anticrm/model-telegram'
import { createModel as attachmentModel } from '@anticrm/model-attachment'
import { createModel as leadModel } from '@anticrm/model-lead'
import { createModel as gmailModel } from '@anticrm/model-gmail'
import { createModel as inventoryModel } from '@anticrm/model-inventory'
import { createModel as presentationModel } from '@anticrm/model-presentation'
import { createModel as templatesModel } from '@anticrm/model-templates'
import { createModel as textEditorModel } from '@anticrm/model-text-editor'

import { createModel as serverCoreModel } from '@anticrm/model-server-core'
import { createModel as serverAttachmentModel } from '@anticrm/model-server-attachment'
import { createModel as serverContactModel } from '@anticrm/model-server-contact'
import { createModel as activityModel } from '@anticrm/model-activity'

import { createDemo } from '@anticrm/model-demo'

const builder = new Builder()

coreModel(builder)
activityModel(builder)
attachmentModel(builder)
viewModel(builder)
workbenchModel(builder)
contactModel(builder)
chunterModel(builder)
taskModel(builder)
recruitModel(builder)
settingModel(builder)
telegramModel(builder)
leadModel(builder)
gmailModel(builder)
inventoryModel(builder)
presentationModel(builder)
templatesModel(builder)
textEditorModel(builder)

serverCoreModel(builder)
serverAttachmentModel(builder)
serverContactModel(builder)

createDemo(builder)

export default builder

// Export upgrade procedures
export { migrateOperations } from './migration'

export { createDeps } from './creation'
