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

import { Request, Response } from 'express'
import { type SendMailOptions } from 'nodemailer'
import Mail from 'nodemailer/lib/mailer'
import { join } from 'path'

import { Analytics } from '@hcengineering/analytics'
import { configureAnalytics, createOpenTelemetryMetricsContext, SplitLogger } from '@hcengineering/analytics-service'
import { MeasureContext, newMetrics } from '@hcengineering/core'
import { initStatisticsContext } from '@hcengineering/server-core'

import config from './config'
import { MailClient } from './mail'
import { createServer, listen } from './server'
import { Endpoint } from './types'

export const main = async (): Promise<void> => {
  configureAnalytics('mail', process.env.VERSION ?? '0.7.0')
  Analytics.setTag('application', 'mail')
  const measureCtx = initStatisticsContext('mail', {
    factory: () =>
      createOpenTelemetryMetricsContext(
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
  const { from, to, subject, text, html, attachments, headers, apiKey, password } = req.body
  if (process.env.API_KEY !== undefined && process.env.API_KEY !== apiKey) {
    ctx.warn('Unauthorized access attempt to send email', {
      from,
      to
    })
    res.status(401).send({ err: 'Unauthorized' })
    return
  }
  const fromAddress = from ?? config.source
  if (text === undefined && html === undefined) {
    ctx.warn('Text and html are missing in email request', { from, to })
    res.status(400).send({ err: "'text' and 'html' are missing" })
    return
  }
  if (subject === undefined) {
    ctx.warn('Subject is missing in email request', { from, to })
    res.status(400).send({ err: "'subject' is missing" })
    return
  }
  if (to === undefined) {
    ctx.warn('To address is missing in email request', { from })
    res.status(400).send({ err: "'to' is missing" })
    return
  }
  if (fromAddress === undefined) {
    ctx.warn('From address is missing in email request', { to })
    res.status(400).send({ err: "'from' is missing" })
    return
  }
  const message: SendMailOptions = {
    from: fromAddress,
    to,
    subject,
    text
  }
  // When sending system message, ensure we enable replying to a different domain as needed
  if (config.replyTo !== undefined && fromAddress === config.source) {
    message.replyTo = config.replyTo
  }
  if (html !== undefined) {
    message.html = html
  }
  if (headers !== undefined) {
    message.headers = headers
  }
  if (attachments !== undefined) {
    message.attachments = getAttachments(attachments)
  }
  try {
    await client.sendMessage(message, ctx, password)
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
