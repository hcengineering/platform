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

import { createServer, listen } from './server'
import { Endpoint } from './types'
import config from './config'

export const main = async (): Promise<void> => {
  const endpoints: Endpoint[] = [
    {
      endpoint: '/mta',
      type: 'post',
      handler: async (req, res) => {
        console.log('mta-hook retrieved')
        const message = getMessageInfo(req.body)
        console.log('Email from:', message?.from)
        // TODO: Send request to add message or put event to the queue

        res.json({
          action: 'accept'
        })
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

const getMessageInfo = (
  body: any
): { from: string, to: string[], subject: string, contents: any, size: number } | undefined => {
  try {
    const from = body.envelope.from.address
    const to = body.envelope.to.map((recipient: any) => recipient.address)
    const subjectHeader = body.message.headers.find((header: any) => header[0] === 'Subject')
    const subject = subjectHeader !== undefined ? subjectHeader[1] : 'No Subject'
    const contents = body.message.contents
    const size = body.message.size

    return {
      from,
      to,
      subject,
      contents,
      size
    }
  } catch (e) {
    console.error('Failed to parse message:', e)
    return undefined
  }
}
