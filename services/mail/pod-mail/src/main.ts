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

import config from './config'
import { createServer, listen } from './server'
import { MailClient } from './mail'
import { Endpoint } from './types'

export const main = async (): Promise<void> => {
  const client = new MailClient()
  console.log('Mail service has been started')

  const endpoints: Endpoint[] = [
    {
      endpoint: '/send',
      type: 'post',
      handler: async (req, res) => {
        await handleSendMail(client, req, res)
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
  process.on('uncaughtException', (e) => {
    console.error(e)
  })
  process.on('unhandledRejection', (e) => {
    console.error(e)
  })
}

export async function handleSendMail (client: MailClient, req: Request, res: Response): Promise<void> {
  // Skip auth check, since service should be internal
  const message: SendMailOptions = req.body
  if (message?.text === undefined) {
    res.status(400).send({ err: "'text' is missing" })
    return
  }
  if (message?.subject === undefined) {
    res.status(400).send({ err: "'subject' is missing" })
    return
  }
  if (message?.to === undefined) {
    res.status(400).send({ err: "'to' is missing" })
    return
  }
  try {
    await client.sendMessage(message)
  } catch (err) {
    console.log(err)
  }

  res.send()
}
