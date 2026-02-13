//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { getClient } from '@hcengineering/account-client'
import core, {
  AccountRole,
  type AccountUuid,
  type Class,
  type Doc,
  generateId,
  MeasureContext,
  type Ref,
  systemAccountUuid,
  type TxOperations,
  WorkspaceIds,
  WorkspaceUuid
} from '@hcengineering/core'
import exportPlugin from '@hcengineering/export'
import notification from '@hcengineering/notification'
import { generateToken } from '@hcengineering/server-token'
import envConfig from './config'

export async function sendExportCompletionNotification (
  ctx: MeasureContext,
  targetTxOps: TxOperations,
  targetWorkspace: WorkspaceUuid,
  targetWsIds: WorkspaceIds,
  exportedDocuments: Array<{ docId: Ref<Doc>, name: string }>,
  sourceWsIds: WorkspaceIds,
  objectClass: Ref<Class<Doc>>
): Promise<void> {
  try {
    const count = exportedDocuments.length
    const resultId = generateId<Doc>()

    await targetTxOps.createDoc(
      exportPlugin.class.ExportResultRecord,
      core.space.Space,
      {
        sourceWorkspace: sourceWsIds.url,
        targetWorkspace: targetWsIds.url,
        exportedCount: count,
        exportedDocumentIds: exportedDocuments.map((d) => d.docId),
        objectClass
      },
      resultId
    )

    const targetWsToken = generateToken(systemAccountUuid, targetWorkspace, { service: 'export' })
    const targetAccountClient = getClient(envConfig.AccountsUrl, targetWsToken)
    const members = await targetAccountClient.getWorkspaceMembers()
    const owners = members.filter((m: { role: string }) => m.role === AccountRole.Owner) as Array<{
      person: AccountUuid
    }>

    if (owners.length === 0) {
      ctx.warn('No workspace owners found for export notification', { targetWorkspace })
      return
    }

    for (const owner of owners) {
      try {
        const docNotifyContextId = await targetTxOps.createDoc(notification.class.DocNotifyContext, core.space.Space, {
          objectId: resultId,
          objectClass: exportPlugin.class.ExportResultRecord,
          objectSpace: core.space.Space,
          user: owner.person,
          isPinned: false,
          hidden: false
        })

        await targetTxOps.createDoc(notification.class.CommonInboxNotification, core.space.Space, {
          user: owner.person,
          objectId: resultId,
          objectClass: exportPlugin.class.ExportResultRecord,
          icon: exportPlugin.icon.Export,
          header: exportPlugin.string.ImportCompleted,
          message: exportPlugin.string.ImportToWorkspaceNotificationMessage,
          props: {
            count,
            sourceWorkspace: sourceWsIds.uuid
          },
          isViewed: false,
          archived: false,
          docNotifyContext: docNotifyContextId,
          types: [exportPlugin.ids.ImportedDocumentsNotification]
        })
      } catch (err) {
        ctx.error('Failed to create export notification for owner', { owner: owner.person, err })
      }
    }
  } catch (err) {
    ctx.error('Failed to send export completion notification', { err })
  }
}
