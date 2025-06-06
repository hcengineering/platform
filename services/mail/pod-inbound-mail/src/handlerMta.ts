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
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
import { createHash } from 'crypto'
import { Request, Response } from 'express'
import { MeasureContext } from '@hcengineering/core'
import { type EmailContact, type EmailMessage, createMessages, getProducer } from '@hcengineering/mail-common'
import { getClient as getAccountClient } from '@hcengineering/account-client'
import { createRestTxOperations } from '@hcengineering/api-client'

import { mailServiceToken, baseConfig, kvsClient } from './client'
import config from './config'
import { MtaMessage } from './types'
import { getHeader, parseContent } from './utils'
import { decodeEncodedWords } from './decode'

export async function handleMtaHook (req: Request, res: Response, ctx: MeasureContext): Promise<void> {
  try {
    if (config.hookToken !== undefined) {
      const token = req.headers['x-hook-token']
      if (token !== config.hookToken) {
        throw new Error('Invalid hook token')
      }
    }

    const mta: MtaMessage = req.body

    const from: EmailContact = getEmailContact(mta.envelope.from.address)
    if (config.ignoredAddresses.includes(from.email)) {
      return
    }
    const fromHeader = getHeader(mta, 'From')
    if (fromHeader !== undefined) {
      const { firstName, lastName } = extractContactName(ctx, fromHeader, from.email)
      from.firstName = firstName
      from.lastName = lastName
    }

    const tos: EmailContact[] = mta.envelope.to.map((to) => getEmailContact(stripTags(to.address)))
    const toHeader = getHeader(mta, 'To')
    if (toHeader !== undefined) {
      for (const part of toHeader.split(',')) {
        for (const to of tos) {
          if (part.includes(to.email)) {
            const { firstName, lastName } = extractContactName(ctx, part, to.email)
            to.firstName = firstName
            to.lastName = lastName
          }
        }
      }
    }

    const subject = decodeEncodedWords(ctx, getHeader(mta, 'Subject') ?? '')
    const inReplyTo = getHeader(mta, 'In-Reply-To')
    const { content, attachments } = await parseContent(ctx, mta)

    let mailId = getHeader(mta, 'Message-ID')
    if (mailId === undefined) {
      mailId = createHash('sha256')
        .update(
          JSON.stringify({
            from: from.email,
            to: tos.map((to) => to.email),
            subject,
            content
          })
        )
        .digest('hex')
    }
    const date = Date.now()
    const convertedMessage: EmailMessage = {
      mailId,
      from,
      to: tos,
      subject,
      content,
      textContent: content,
      replyTo: inReplyTo,
      incoming: true,
      modifiedOn: date,
      sendOn: date
    }

    const accountClient = getAccountClient(config.accountsUrl, mailServiceToken)
    const wsInfo = await accountClient.selectWorkspace(config.workspaceUrl)
    const transactorUrl = wsInfo.endpoint.replace('ws://', 'http://').replace('wss://', 'https://')
    const txClient = await createRestTxOperations(transactorUrl, wsInfo.workspace, wsInfo.token)

    await createMessages(
      baseConfig,
      ctx,
      txClient,
      kvsClient,
      await getProducer(baseConfig.CommunicationTopic),
      mailServiceToken,
      wsInfo,
      convertedMessage,
      attachments
    )
  } catch (error) {
    ctx.error('mta-hook', { error })
  } finally {
    // Any error in the mta-hook should not prevent the mail server from handling emails
    res.status(200).send({ action: 'accept' })
  }
}

function getEmailContact (email: string): EmailContact {
  const parts = stripTags(email).split('@')
  return {
    email,
    firstName: parts[0],
    lastName: parts[1]
  }
}

function extractContactName (
  ctx: MeasureContext,
  fromHeader: string,
  email: string
): { firstName: string, lastName: string } {
  // Match name part that appears before an email in angle brackets
  const nameMatch = fromHeader.match(/^\s*"?([^"<]+?)"?\s*<.+?>/)
  const encodedName = nameMatch?.[1].trim() ?? ''
  const name = encodedName.length > 0 ? decodeEncodedWords(ctx, encodedName) : ''
  let [firstName, lastName] = name.split(' ')
  if (firstName === undefined || firstName.length === 0) {
    firstName = email.split('@')[0]
  }
  if (lastName === undefined || lastName.length === 0) {
    lastName = email.split('@')[1]
  }
  return { firstName, lastName }
}

function stripTags (email: string): string {
  const [name, domain] = email.split('@')
  const tagStart = name.indexOf('+')
  if (tagStart === -1) {
    return email
  }
  const clearName = name.substring(0, tagStart)
  return `${clearName}@${domain}`
}
