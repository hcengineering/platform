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
        const text = req.body?.text
        if (text === undefined) {
          res.status(400).send({ err: "'text' is missing" })
          return
        }
        const subject = req.body?.subject
        if (subject === undefined) {
          res.status(400).send({ err: "'subject' is missing" })
          return
        }
        const html = req.body?.html
        const to = req.body?.to
        if (to === undefined) {
          res.status(400).send({ err: "'to' is missing" })
          return
        }
        const receivers = {
          to: Array.isArray(to) ? to : [to]
        }
        const from = req.body?.from
        try {
          await client.sendMessage({ text, subject, html }, receivers, from)
        } catch (err) {
          console.log(err)
        }

        res.send()
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
