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
import {
  AccountRole,
  concatLink,
  Doc,
  MeasureContext,
  Ref,
  systemAccountUuid,
  WorkspaceIds,
  WorkspaceUuid
} from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'
import envConfig from './config'

export async function sendExportCompletionEmail (
  ctx: MeasureContext,
  accountClient: any,
  targetWorkspace: WorkspaceUuid,
  targetWsIds: WorkspaceIds,
  exportedDocuments: Array<{ docId: Ref<Doc>, name: string }>,
  sourceWsIds: WorkspaceIds
): Promise<void> {
  try {
    // Get workspace members to find owners
    const targetWsToken = generateToken(systemAccountUuid, targetWorkspace, { service: 'export' })
    const targetAccountClient = getClient(envConfig.AccountsUrl, targetWsToken)
    const members = await targetAccountClient.getWorkspaceMembers()

    // Find workspace owners
    const owners = members.filter((m: any) => m.role === AccountRole.Owner)

    if (owners.length === 0) {
      ctx.warn('No workspace owners found for email notification', { targetWorkspace })
      return
    }

    // Get email addresses for owners
    const ownerEmails: string[] = []
    for (const owner of owners) {
      try {
        const personInfo = await targetAccountClient.getPersonInfo(owner.person)
        const emailSocialId = personInfo.socialIds.find(
          (sid: any) => (sid.type === 'EMAIL' || sid.type === 'GOOGLE') && sid.verifiedOn > 0 && sid.isDeleted !== true
        )
        if (emailSocialId?.value != null && emailSocialId.value !== '') {
          ownerEmails.push(emailSocialId.value)
        }
      } catch (err) {
        ctx.warn('Failed to get email for workspace owner', { owner: owner.person, error: err })
      }
    }

    if (ownerEmails.length === 0) {
      ctx.warn('No email addresses found for workspace owners', { targetWorkspace })
      return
    }

    // Build email content
    const documentList = exportedDocuments.map((doc) => `  - ${doc.name}`).join('\n')
    const subject = `Export completed: ${exportedDocuments.length} document${exportedDocuments.length !== 1 ? 's' : ''} exported to your workspace`
    const text = `The following ${exportedDocuments.length} document${exportedDocuments.length !== 1 ? 's have' : ' has'} been successfully exported to your workspace:\n\n${documentList}\n\nSource workspace: ${sourceWsIds.uuid}\nTarget workspace: ${targetWsIds.uuid}`
    const html = `<p>The following <strong>${exportedDocuments.length}</strong> document${exportedDocuments.length !== 1 ? 's have' : ' has'} been successfully exported to your workspace:</p><ul>${exportedDocuments.map((doc) => `<li>${escapeHtml(doc.name)}</li>`).join('')}</ul><p>Source workspace: ${sourceWsIds.uuid}<br>Target workspace: ${targetWsIds.uuid}</p>`

    // Send email to all owners
    const mailURL = envConfig.MailURL
    if (mailURL === undefined || mailURL === null || typeof mailURL !== 'string' || mailURL === '') {
      ctx.warn('Mail service URL not configured, skipping email notification')
      return
    }

    const mailAuth: string | undefined = envConfig.MailAuthToken
    for (const email of ownerEmails) {
      try {
        const response = await fetch(concatLink(mailURL, '/send'), {
          method: 'post',
          keepalive: true,
          headers: {
            'Content-Type': 'application/json',
            ...(mailAuth != null ? { Authorization: `Bearer ${mailAuth}` } : {})
          },
          body: JSON.stringify({
            text,
            html,
            subject,
            to: [email]
          })
        })
        if (!response.ok) {
          ctx.error(`Failed to send export completion email: ${response.statusText}`, { email })
        } else {
          ctx.info('Export completion email sent', { email, documentCount: exportedDocuments.length })
        }
      } catch (err) {
        ctx.error('Could not send export completion email', { err, email })
      }
    }
  } catch (err) {
    ctx.error('Failed to send export completion email', { err })
  }
}

function escapeHtml (text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
