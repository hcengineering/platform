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
import { type MigrateOperation } from '@hcengineering/model'
import { activityOperation } from '@hcengineering/model-activity'
import { attachmentOperation } from '@hcengineering/model-attachment'
import { bitrixOperation } from '@hcengineering/model-bitrix'
import { boardOperation } from '@hcengineering/model-board'
import { calendarOperation } from '@hcengineering/model-calendar'
import { chunterOperation } from '@hcengineering/model-chunter'
import { contactOperation } from '@hcengineering/model-contact'
import { coreOperation } from '@hcengineering/model-core'
import { documentOperation } from '@hcengineering/model-document'
import { driveOperation } from '@hcengineering/model-drive'
import { gmailOperation } from '@hcengineering/model-gmail'
import { guestOperation } from '@hcengineering/model-guest'
import { hrOperation } from '@hcengineering/model-hr'
import { inventoryOperation } from '@hcengineering/model-inventory'
import { leadOperation } from '@hcengineering/model-lead'
import { notificationOperation } from '@hcengineering/model-notification'
import { preferenceOperation } from '@hcengineering/model-preference'
import { recruitOperation } from '@hcengineering/model-recruit'
import { activityServerOperation } from '@hcengineering/model-server-activity'
import { settingOperation } from '@hcengineering/model-setting'
import { tagsOperation } from '@hcengineering/model-tags'
import { taskOperation } from '@hcengineering/model-task'
import { telegramOperation } from '@hcengineering/model-telegram'
import { templatesOperation } from '@hcengineering/model-templates'
import { timeOperation } from '@hcengineering/model-time'
import { trackerOperation } from '@hcengineering/model-tracker'
import { viewOperation } from '@hcengineering/model-view'
import { textEditorOperation } from '@hcengineering/model-text-editor'
import { githubOperation, githubOperationPreTime } from '@hcengineering/model-github'
import { loveId, loveOperation } from '@hcengineering/model-love'
import { questionsOperation } from '@hcengineering/model-questions'
import { trainingOperation } from '@hcengineering/model-training'
import { documentsOperation } from '@hcengineering/model-controlled-documents'
import { productsOperation } from '@hcengineering/model-products'
import { requestOperation } from '@hcengineering/model-request'
import { analyticsCollectorOperation } from '@hcengineering/model-analytics-collector'
import { workbenchOperation } from '@hcengineering/model-workbench'
import { testManagementOperation } from '@hcengineering/model-test-management'

export const migrateOperations: [string, MigrateOperation][] = [
  ['core', coreOperation],
  ['activity', activityOperation],
  ['chunter', chunterOperation],
  ['calendar', calendarOperation],
  ['gmail', gmailOperation],
  ['templates', templatesOperation],
  ['telegram', telegramOperation],
  ['task', taskOperation],
  ['attachment', attachmentOperation],
  ['lead', leadOperation],
  ['preference', preferenceOperation],
  ['recruit', recruitOperation],
  ['view', viewOperation],
  ['contact', contactOperation],
  ['guest', guestOperation],
  ['tags', tagsOperation],
  ['setting', settingOperation],
  ['tracker', trackerOperation],
  ['documents', documentsOperation],
  ['questions', questionsOperation],
  ['training', trainingOperation],
  ['request', requestOperation],
  ['products', productsOperation],
  ['board', boardOperation],
  ['hr', hrOperation],
  ['document', documentOperation],
  ['drive', driveOperation],
  ['bitrix', bitrixOperation],
  ['inventiry', inventoryOperation],
  ['github', githubOperation],
  ['pre-time', githubOperationPreTime],
  ['time', timeOperation],
  [loveId, loveOperation],
  ['activityServer', activityServerOperation],
  ['textEditorOperation', textEditorOperation],
  // We should call notification migration after activityServer and chunter
  ['notification', notificationOperation],
  ['analyticsCollector', analyticsCollectorOperation],
  ['workbench', workbenchOperation],
  ['testManagement', testManagementOperation]
]
