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

import { prepareTools as prepareToolsRaw } from '@hcengineering/server-tool'

import { Data, Tx, Version } from '@hcengineering/core'
import { MigrateOperation } from '@hcengineering/model'
import builder, { migrateOperations, version } from '@hcengineering/model-all'
import { MinioService } from '@hcengineering/minio'
import { devTool } from '.'

import { serverAttachmentId } from '@hcengineering/server-attachment'
import { serverCalendarId } from '@hcengineering/server-calendar'
import { serverChunterId } from '@hcengineering/server-chunter'
import { serverContactId } from '@hcengineering/server-contact'
import { serverGmailId } from '@hcengineering/server-gmail'
import { serverInventoryId } from '@hcengineering/server-inventory'
import { serverLeadId } from '@hcengineering/server-lead'
import { serverNotificationId } from '@hcengineering/server-notification'
import { serverRecruitId } from '@hcengineering/server-recruit'
import { serverSettingId } from '@hcengineering/server-setting'
import { serverTagsId } from '@hcengineering/server-tags'
import { serverTaskId } from '@hcengineering/server-task'
import { serverTrackerId } from '@hcengineering/server-tracker'
import { serverTelegramId } from '@hcengineering/server-telegram'
import { serverHrId } from '@hcengineering/server-hr'
import { serverRequestId } from '@hcengineering/server-request'
import { serverViewId } from '@hcengineering/server-view'
import { addLocation } from '@hcengineering/platform'

addLocation(serverAttachmentId, () => import('@hcengineering/server-attachment-resources'))
addLocation(serverContactId, () => import('@hcengineering/server-contact-resources'))
addLocation(serverNotificationId, () => import('@hcengineering/server-notification-resources'))
addLocation(serverChunterId, () => import('@hcengineering/server-chunter-resources'))
addLocation(serverInventoryId, () => import('@hcengineering/server-inventory-resources'))
addLocation(serverLeadId, () => import('@hcengineering/server-lead-resources'))
addLocation(serverRecruitId, () => import('@hcengineering/server-recruit-resources'))
addLocation(serverSettingId, () => import('@hcengineering/server-setting-resources'))
addLocation(serverTaskId, () => import('@hcengineering/server-task-resources'))
addLocation(serverTrackerId, () => import('@hcengineering/server-tracker-resources'))
addLocation(serverTagsId, () => import('@hcengineering/server-tags-resources'))
addLocation(serverCalendarId, () => import('@hcengineering/server-calendar-resources'))
addLocation(serverGmailId, () => import('@hcengineering/server-gmail-resources'))
addLocation(serverTelegramId, () => import('@hcengineering/server-telegram-resources'))
addLocation(serverHrId, () => import('@hcengineering/server-hr-resources'))
addLocation(serverRequestId, () => import('@hcengineering/server-request-resources'))
addLocation(serverViewId, () => import('@hcengineering/server-view-resources'))

function prepareTools (): {
  mongodbUri: string
  minio: MinioService
  txes: Tx[]
  version: Data<Version>
  migrateOperations: MigrateOperation[]
} {
  return { ...prepareToolsRaw(builder.getTxes()), version, migrateOperations }
}

devTool(prepareTools, '')
