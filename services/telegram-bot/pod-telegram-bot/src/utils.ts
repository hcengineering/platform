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
import { Message } from 'telegraf/typings/core/types/typegram'
import { TelegramNotificationRequest } from '@hcengineering/telegram'
import { Parser } from 'htmlparser2'
import { MediaGroup } from 'telegraf/typings/telegram-types'
import { InputMediaAudio, InputMediaDocument, InputMediaPhoto, InputMediaVideo } from 'telegraf/src/core/types/typegram'
import { Context, Input } from 'telegraf'

import { OtpRecord, PlatformFileInfo, TelegramFileInfo } from './types'

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

const maxTitleLength = 300
const maxQuoteLength = 500
const maxBodyLength = 2000
const maxSenderLength = 100

export function toTelegramHtml (record: TelegramNotificationRequest): {
  full: string
  short: string
} {
  const title =
    record.title !== '' ? `<a href='${record.link}'>${platformToTelegram(record.title, maxTitleLength)}</a>` + '\n' : ''
  const quote =
    record.quote !== undefined && record.quote !== ''
      ? `<blockquote>${platformToTelegram(record.quote, maxQuoteLength)}</blockquote>` + '\n'
      : ''
  const rawBody = platformToTelegram(record.body, maxBodyLength)
  const body = rawBody === '' ? '' : rawBody + '\n'
  const sender = `<i>— ${record.sender.slice(0, maxSenderLength)}</i>`

  const full = title + quote + body + sender
  const short = title + sender

  return {
    full,
    short
  }
}

const supportedTags = ['b', 'strong', 'em', 's', 'strike', 'del', 'blockquote', 'code', 'a', 'pre', 'u', 'i']

export function platformToTelegram (message: string, limit: number): string {
  let textLength = 0
  let newMessage = ''
  const openedTags = new Map<
  string,
  {
    count: number
    hasContent: boolean
    defaultText: string
  }
  >()

  const parser = new Parser({
    onopentag: (tag, attributes) => {
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

      let defaultText = ''

      if (tag === 'a' && 'href' in attributes) {
        newMessage += `<a href="${attributes.href}">`
        defaultText = attributes.href
      } else {
        newMessage += `<${tag}>`
      }

      openedTags.set(tag, {
        count: 1,
        hasContent: false,
        defaultText
      })
    },
    ontext: (rawText) => {
      if (textLength >= limit) {
        return
      }

      const text = unescape(rawText)
      textLength += text.length
      newMessage += text

      const lastOpenedTag = Array.from(openedTags.keys()).pop()
      if (lastOpenedTag != null) {
        const tagData = openedTags.get(lastOpenedTag)
        if (tagData != null && text !== '') {
          tagData.hasContent = true
        }
      }

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

      if (!existingTag.hasContent && existingTag.defaultText !== '') {
        newMessage += existingTag.defaultText
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

export function toTgMediaFile (
  file: PlatformFileInfo,
  caption: string
): InputMediaPhoto | InputMediaVideo | InputMediaAudio | InputMediaDocument {
  const { type, filename, buffer } = file

  if (type.startsWith('image/')) {
    return {
      type: 'photo',
      caption,
      parse_mode: 'HTML',
      media: Input.fromBuffer(buffer, filename)
    }
  } else if (type.startsWith('video/')) {
    return {
      type: 'video',
      caption,
      parse_mode: 'HTML',
      media: Input.fromBuffer(buffer, filename)
    }
  } else if (type.startsWith('audio/')) {
    return {
      type: 'audio',
      caption,
      parse_mode: 'HTML',
      media: Input.fromBuffer(buffer, filename)
    }
  } else {
    return {
      type: 'document',
      caption,
      parse_mode: 'HTML',
      media: Input.fromBuffer(buffer, filename)
    }
  }
}

export function toMediaGroups (files: PlatformFileInfo[], fullMessage: string, shortMessage: string): MediaGroup[] {
  const photos: (InputMediaPhoto | InputMediaVideo)[] = []
  const audios: InputMediaAudio[] = []
  const documents: InputMediaDocument[] = []

  for (const file of files) {
    const media = toTgMediaFile(file, shortMessage)
    if (media.type === 'photo' || media.type === 'video') {
      photos.push(media)
    } else if (media.type === 'audio') {
      audios.push(media)
    } else {
      documents.push(media)
    }
  }

  const result = [photos, audios, documents].filter((it) => it.length > 0)

  result[0][0].caption = fullMessage

  return result
}

export async function toTelegramFileInfo (
  ctx: Context,
  message:
  | Message.CommonMessage
  | Message.PhotoMessage
  | Message.VideoMessage
  | Message.VoiceMessage
  | Message.VideoNoteMessage
  | Message.DocumentMessage
): Promise<TelegramFileInfo | undefined> {
  try {
    if ('photo' in message) {
      const photos = message.photo
      const photo = photos[photos.length - 1]
      const { file_id: fileId, height, width, file_size: fileSize } = photo
      const url = (await ctx.telegram.getFileLink(fileId)).toString()
      const fileName = url.split('/').pop()
      return { url, width, height, name: fileName, size: fileSize, type: 'image/jpeg' }
    }

    if ('video' in message) {
      const video = message.video
      const { file_id: fileId, height, width, file_size: fileSize, mime_type: type, file_name: fileName } = video
      const url = (await ctx.telegram.getFileLink(fileId)).toString()
      return { url, width, height, name: fileName, size: fileSize, type: type ?? 'video/mp4' }
    }

    if ('video_note' in message) {
      const videoNote = message.video_note
      const { file_id: fileId, file_size: fileSize } = videoNote
      const url = (await ctx.telegram.getFileLink(fileId)).toString()
      return { url, width: 0, height: 0, size: fileSize, type: 'video/mp4' }
    }

    if ('voice' in message) {
      const voice = message.voice
      const { file_id: fileId, file_size: fileSize, mime_type: type } = voice
      const url = (await ctx.telegram.getFileLink(fileId)).toString()
      return { url, width: 0, height: 0, size: fileSize, type: type ?? 'audio/ogg' }
    }

    if ('document' in message) {
      const document = message.document
      const { file_id: fileId, file_size: fileSize, mime_type: type, file_name: fileName } = document
      if (type == null) return
      const url = (await ctx.telegram.getFileLink(fileId)).toString()
      return { url, width: 0, height: 0, size: fileSize, name: fileName, type }
    }
  } catch (e) {
    console.error('Failed to get file info', e)
    return undefined
  }

  return undefined
}
