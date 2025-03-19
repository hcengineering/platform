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

import { type SendMailOptions } from 'nodemailer'
import { Request, Response } from 'express'
import Mail from 'nodemailer/lib/mailer'
import { initStatisticsContext } from '@hcengineering/server-core'
import { MeasureContext, MeasureMetricsContext, newMetrics } from '@hcengineering/core'
import { SplitLogger } from '@hcengineering/analytics-service'
import { join } from 'path'

import config from './config'
import { createServer, listen } from './server'
import { MailClient } from './mail'
import { Endpoint } from './types'

export const main = async (): Promise<void> => {
  const measureCtx = initStatisticsContext('mail', {
    factory: () =>
      new MeasureMetricsContext(
        'mail',
        {},
        {},
        newMetrics(),
        new SplitLogger('mail', {
          root: join(process.cwd(), 'logs'),
          enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
        })
      )
  })
  const client = new MailClient()
  measureCtx.info('Mail service has been started')

  const endpoints: Endpoint[] = [
    {
      endpoint: '/send',
      type: 'post',
      handler: async (req, res) => {
        await handleSendMail(client, req, res, measureCtx)
      }
    }
  ]

  const server = listen(createServer(endpoints), config.port)

  const shutdown = (): void => {
    server.close(() => {
      process.exit()
    })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  process.on('uncaughtException', (e: any) => {
    measureCtx.error(e.message)
  })
  process.on('unhandledRejection', (e: any) => {
    measureCtx.error(e.message)
  })
}

export async function handleSendMail (
  client: MailClient,
  req: Request,
  res: Response,
  ctx: MeasureContext
): Promise<void> {
  // Skip auth check, since service should be internal
  const { from, to, subject, text, html, attachments } = req.body
  const fromAddress = from ?? config.source
  if (text === undefined) {
    res.status(400).send({ err: "'text' is missing" })
    return
  }
  if (subject === undefined) {
    res.status(400).send({ err: "'subject' is missing" })
    return
  }
  if (to === undefined) {
    res.status(400).send({ err: "'to' is missing" })
    return
  }
  if (fromAddress === undefined) {
    res.status(400).send({ err: "'from' is missing" })
    return
  }
  const message: SendMailOptions = {
    from: fromAddress,
    to,
    subject,
    text
  }
  if (html !== undefined) {
    message.html = html
  }
  if (attachments !== undefined) {
    message.attachments = getAttachments(attachments)
  }
  try {
    await client.sendMessage(message, ctx)
  } catch (err: any) {
    ctx.error(err.message)
  }

  res.send()
}

function getAttachments (attachments: any): Mail.Attachment[] | undefined {
  if (attachments === undefined || attachments === null) {
    return undefined
  }
  if (!Array.isArray(attachments)) {
    console.error('attachments is not array')
    return undefined
  }
  return attachments.map((a) => {
    const attachment: Mail.Attachment = {
      content: a.content,
      contentType: a.contentType,
      path: a.path,
      filename: a.filename,
      cid: a.cid,
      encoding: a.encoding,
      contentTransferEncoding: a.contentTransferEncoding,
      headers: a.headers,
      raw: a.raw
    }
    return attachment
  })
}
