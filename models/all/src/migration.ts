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

// Import migrate operations.
import { MigrateOperation } from '@hcengineering/model'
import { attachmentOperation } from '@hcengineering/model-attachment'
import { automationOperation } from '@hcengineering/model-automation'
import { chunterOperation } from '@hcengineering/model-chunter'
import { contactOperation } from '@hcengineering/model-contact'
import { coreOperation } from '@hcengineering/model-core'
import { gmailOperation } from '@hcengineering/model-gmail'
import { leadOperation } from '@hcengineering/model-lead'
import { notificationOperation } from '@hcengineering/model-notification'
import { settingOperation } from '@hcengineering/model-setting'
import { recruitOperation } from '@hcengineering/model-recruit'
import { tagsOperation } from '@hcengineering/model-tags'
import { taskOperation } from '@hcengineering/model-task'
import { inventoryOperation } from '@hcengineering/model-inventory'
import { telegramOperation } from '@hcengineering/model-telegram'
import { templatesOperation } from '@hcengineering/model-templates'
import { viewOperation } from '@hcengineering/model-view'
import { trackerOperation } from '@hcengineering/model-tracker'
import { boardOperation } from '@hcengineering/model-board'
import { demoOperation } from '@hcengineering/model-demo'
import { hrOperation } from '@hcengineering/model-hr'
import { documentOperation } from '@hcengineering/model-document'
import { bitrixOperation } from '@hcengineering/model-bitrix'

export const migrateOperations: MigrateOperation[] = [
  coreOperation,
  chunterOperation,
  demoOperation,
  gmailOperation,
  templatesOperation,
  telegramOperation,
  taskOperation,
  attachmentOperation,
  automationOperation,
  leadOperation,
  recruitOperation,
  viewOperation,
  contactOperation,
  tagsOperation,
  notificationOperation,
  settingOperation,
  trackerOperation,
  boardOperation,
  hrOperation,
  documentOperation,
  bitrixOperation,
  inventoryOperation
]
