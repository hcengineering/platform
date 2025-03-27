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
import { readEml, ReadedEmlJson } from 'eml-parse-js'
import { Request, Response } from 'express'
import { htmlToMarkup } from '@hcengineering/text-html'
import { createMessages } from './message'

interface MtaMessage {
  envelope: {
    from: {
      address: string
    }
    to: {
      address: string
    }[]
  }
  message: {
    headers: string[][]
    contents: string
  }
}

export async function handleMtaHook (req: Request, res: Response): Promise<void> {
  try {
    const mta: MtaMessage = req.body

    const fromAddress = mta.envelope.from.address
    const fromHeader = mta.message.headers.find((header) => header[0] === 'From')?.[1] ?? ''
    const fromName = extractContactName(fromHeader)
    const to = mta.envelope.to.map((to) => to.address)
    const subject = (mta.message.headers.find((header) => header[0] === 'Subject')?.[1] ?? '').trim()
    const inReplyTo = mta.message.headers.find((header) => header[0] === 'In-Reply-To')?.[1]?.trim()
    const content = await getContent(mta)

    let mailId = mta.message.headers.find((header) => header[0] === 'Message-ID')?.[1].trim()
    if (mailId === undefined) {
      mailId = createHash('sha256').update(JSON.stringify({
        fromAddress,
        to,
        subject,
        content
      })).digest('hex')
    }

    await createMessages(mailId, fromAddress, fromName, to, subject, content, inReplyTo)
  } catch (err) {
    console.error('mta-hook', err)
  } finally {
    res.status(200).send({ action: 'accept' })
  }
}

async function getContent (mta: MtaMessage): Promise<string> {
  const contentType = mta.message.headers.find((header) => header[0] === 'Content-Type')?.[1]
  if (contentType === undefined) {
    throw new Error('Content-Type header not found')
  }
  const contents = `Content-Type: ${contentType}\r\n${mta.message.contents}`
  const email = await new Promise<ReadedEmlJson>((resolve, reject) => {
    readEml(contents, (err, json) => {
      if (err !== undefined && err !== null) {
        reject(err)
      } else if (json === undefined) {
        reject(new Error('Failed to parse email'))
      } else {
        resolve(json)
      }
    })
  })
  if (email.html !== undefined) {
    try {
      // Some mailers (e.g. Google) use divs instead of paragraphs
      const html = email.html.replaceAll('<div', '<p').replaceAll('</div>', '</p>')
      const markup = htmlToMarkup(html)
      return JSON.stringify(markup)
    } catch (err) {
      console.warn('Failed to parse html content', err)
    }
  }
  return email.text ?? ''
}

function extractContactName (fromHeader: string): string {
  // Match name part that appears before an email in angle brackets
  const nameMatch = fromHeader.match(/^\s*"?([^"<]+?)"?\s*<.+?>/)
  return nameMatch?.[1].trim() ?? ''
}
