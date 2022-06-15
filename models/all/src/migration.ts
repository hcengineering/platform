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
import { MigrateOperation } from '@anticrm/model'
import { attachmentOperation } from '@anticrm/model-attachment'
import { chunterOperation } from '@anticrm/model-chunter'
import { contactOperation } from '@anticrm/model-contact'
import { coreOperation } from '@anticrm/model-core'
import { gmailOperation } from '@anticrm/model-gmail'
import { leadOperation } from '@anticrm/model-lead'
import { notificationOperation } from '@anticrm/model-notification'
import { settingOperation } from '@anticrm/model-setting'
import { recruitOperation } from '@anticrm/model-recruit'
import { tagsOperation } from '@anticrm/model-tags'
import { taskOperation } from '@anticrm/model-task'
import { telegramOperation } from '@anticrm/model-telegram'
import { templatesOperation } from '@anticrm/model-templates'
import { viewOperation } from '@anticrm/model-view'
import { trackerOperation } from '@anticrm/model-tracker'
import { boardOperation } from '@anticrm/model-board'
import { automationOperation } from '@anticrm/model-automation'
import { demoOperation } from '@anticrm/model-demo'

export const migrateOperations: MigrateOperation[] = [
  coreOperation,
  chunterOperation,
  demoOperation,
  gmailOperation,
  templatesOperation,
  telegramOperation,
  taskOperation,
  attachmentOperation,
  leadOperation,
  recruitOperation,
  viewOperation,
  contactOperation,
  tagsOperation,
  notificationOperation,
  settingOperation,
  trackerOperation,
  boardOperation,
  automationOperation
]
