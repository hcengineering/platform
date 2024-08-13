//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { Collection } from 'mongodb'
import otpGenerator from 'otp-generator'
import { BotCommand } from 'telegraf/typings/core/types/typegram'
import { translate } from '@hcengineering/platform'
import telegram, { TelegramNotificationRecord } from '@hcengineering/telegram'
import { Parser } from 'htmlparser2'

import { OtpRecord } from './types'
import config from './config'

export async function getNewOtp (otpCollection: Collection<OtpRecord>): Promise<string> {
  let otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false
  })

  let exist = await otpCollection.findOne({ otp })

  while (exist != null) {
    otp = otpGenerator.generate(6, {
      lowerCaseAlphabets: false
    })
    exist = await otpCollection.findOne({ otp })
  }

  return otp
}

export async function getBotCommands (lang: string = 'en'): Promise<BotCommand[]> {
  return [
    {
      command: 'start',
      description: await translate(telegram.string.StartBot, { app: config.App }, lang)
    },
    {
      command: 'connect',
      description: await translate(telegram.string.ConnectAccount, { app: config.App }, lang)
    },
    {
      command: 'help',
      description: await translate(telegram.string.ShowCommandsDetails, { app: config.App }, lang)
    },
    {
      command: 'stop',
      description: await translate(telegram.string.TurnNotificationsOff, { app: config.App }, lang)
    }
  ]
}

export async function getCommandsHelp (lang: string): Promise<string> {
  const myCommands = await getBotCommands(lang)
  return myCommands.map(({ command, description }) => `/${command} - ${description}`).join('\n')
}

const maxTitleLength = 300
const maxQuoteLength = 500
const maxBodyLength = 2000
const maxSenderLength = 100

export function toTelegramHtml (record: TelegramNotificationRecord): string {
  const title =
    record.title !== '' ? `<a href='${record.link}'>${platformToTelegram(record.title, maxTitleLength)}</a>` + '\n' : ''
  const quote =
    record.quote !== undefined && record.quote !== ''
      ? `<blockquote>${platformToTelegram(record.quote, maxQuoteLength)}</blockquote>` + '\n'
      : ''
  const body = platformToTelegram(record.body, maxBodyLength)
  const sender = `<i>— ${record.sender.slice(0, maxSenderLength)}</i>`

  return title + quote + body + '\n' + sender
}

const supportedTags = ['strong', 'em', 's', 'blockquote', 'code', 'a']

export function platformToTelegram (message: string, limit: number): string {
  let textLength = 0
  let newMessage = ''
  const openedTags = new Map<
  string,
  {
    count: number
  }
  >()

  const parser = new Parser({
    onopentag: (tag, attrs) => {
      if (tag === 'br' || tag === 'p') {
        return
      }

      if (textLength >= limit) {
        return
      }

      // Just skip unsupported tag
      if (!supportedTags.includes(tag)) {
        return
      }

      const existingTag = openedTags.get(tag)
      if (existingTag !== undefined) {
        existingTag.count += 1
        return
      }

      openedTags.set(tag, {
        count: 1
      })
      newMessage += `<${tag}>`
    },
    ontext: (text) => {
      if (textLength >= limit) {
        return
      }

      textLength += unescape(text).length
      newMessage += unescape(text)

      if (textLength > limit) {
        const extra = textLength - limit + 1
        newMessage = newMessage.slice(0, -extra) + '…'
      }
    },
    onclosetag: (tag) => {
      const isLimit = textLength >= limit
      if (tag === 'br' && !isLimit) {
        newMessage += '\n'
        textLength += 1
        return
      }

      if (tag === 'p' && !isLimit) {
        newMessage += '\n\n'
        textLength += 2
        return
      }

      // Just skip unsupported tag
      if (!supportedTags.includes(tag)) {
        return
      }

      const existingTag = openedTags.get(tag)

      // We have unknown tag
      if (existingTag === undefined) {
        return
      }

      existingTag.count -= 1

      if (existingTag.count <= 0) {
        openedTags.delete(tag)
      }

      newMessage += `</${tag}>`
    }
  })

  parser.write(message)
  parser.end()

  return newMessage.trim()
}
