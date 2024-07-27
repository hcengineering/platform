import { Api } from 'telegram'
import { Parser } from 'htmlparser2'

import { escape, unescape } from './escaping'

type TelegramMessage = Pick<Api.Message, 'message' | 'entities'>
interface BaseProps {
  length: number
  offset: number
  url?: string
}
type EntityBuilder = (props: BaseProps) => Api.TypeMessageEntity
const entityMap = new Map<string, EntityBuilder>([
  ['strong', (props) => new Api.MessageEntityBold(props)],
  ['em', (props) => new Api.MessageEntityItalic(props)],
  ['s', (props) => new Api.MessageEntityStrike(props)],
  ['blockquote', (props) => new Api.MessageEntityBlockquote(props)],
  ['code', (props) => new Api.MessageEntityCode(props)],
  ['a', (props) => new Api.MessageEntityTextUrl(props as any)]
])

export function platformToTelegram (message: string): TelegramMessage {
  const openedTags = new Map<
  string,
  {
    offset: number
    count: number
    url?: string
  }
  >()
  let pureMessage = ''
  const entities: Api.TypeMessageEntity[] = []
  const parser = new Parser({
    onopentag: (tag, attrs) => {
      if (tag === 'br' || tag === 'p') {
        return
      }

      const existingTag = openedTags.get(tag)
      if (existingTag !== undefined) {
        existingTag.count += 1
        return
      }

      // Just skip unsupported tag
      if (!entityMap.has(tag)) {
        return
      }

      openedTags.set(tag, {
        count: 1,
        offset: pureMessage.length,
        url: attrs.href
      })
    },
    ontext: (text) => {
      pureMessage += unescape(text)
    },
    onclosetag: (tag) => {
      if (tag === 'br') {
        pureMessage += '\n'
        return
      }

      if (tag === 'p') {
        pureMessage += '\n\n'
        return
      }

      const existingTag = openedTags.get(tag)

      // We have unknown tag
      if (existingTag === undefined) {
        return
      }

      existingTag.count -= 1
      if (existingTag.count > 0) {
        return
      }

      openedTags.delete(tag)

      const entityBuilder = entityMap.get(tag)
      if (entityBuilder === undefined) {
        return
      }

      const offset = existingTag.offset
      const length = pureMessage.length - offset
      entities.push(entityBuilder({ offset, length, url: existingTag.url }))
    }
  })

  parser.write(message)
  parser.end()

  const result = pureMessage.trim()

  // Adjust entities rely on trimmed chars
  entities.forEach((e) => {
    e.length = Math.min(e.length, result.length - e.offset)
  })

  return {
    message: result,
    entities
  }
}

const transform = (text: string): string => escape(text).replace(/\n/g, '<br>')

// FYI, copypasted from here:
// https://github.com/gram-js/gramjs/blob/master/gramjs/extensions/html.ts
// https://github.com/LonamiWebs/Telethon/blob/master/telethon/extensions/html.py
// with multiple fixes and platform adjustements applied
export function telegramToPlatform (
  { message: text, entities }: TelegramMessage,
  _offset = 0,
  _length?: number
): string {
  // WARNING: It seems message can be undefined even it is not reflected in types
  if (text == null || text === '') {
    return ''
  }

  if (entities == null || entities.length === 0) {
    return transform(text)
  }

  if (_length === undefined) {
    _length = text.length
  }

  const html = []
  let lastOffset = 0
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i]
    if (entity.offset >= _offset + _length) {
      break
    }

    const relativeOffset = entity.offset - _offset
    if (relativeOffset > lastOffset) {
      html.push(transform(text.slice(lastOffset, relativeOffset)))
    } else if (relativeOffset < lastOffset) {
      continue
    }

    let skipEntity = false
    const length = entity.length
    const entityText = telegramToPlatform(
      {
        message: text.slice(relativeOffset, relativeOffset + length),
        entities: entities.slice(i + 1, entities.length)
      },
      entity.offset,
      length
    )
    if (entity instanceof Api.MessageEntityBold) {
      html.push(`<strong>${entityText}</strong>`)
    } else if (entity instanceof Api.MessageEntityItalic) {
      html.push(`<em>${entityText}</em>`)
    } else if (entity instanceof Api.MessageEntityBold) {
      html.push(`<strong>${entityText}</strong>`)
    } else if (entity instanceof Api.MessageEntityCode) {
      html.push(`<code>${entityText}</code>`)
    } else if (entity instanceof Api.MessageEntityUnderline) {
      html.push(`<u>${entityText}</u>`)
    } else if (entity instanceof Api.MessageEntityStrike) {
      html.push(`<s>${entityText}</s>`)
    } else if (entity instanceof Api.MessageEntityBlockquote) {
      html.push(`<blockquote>${entityText}</blockquote>`)
    } else if (entity instanceof Api.MessageEntityPre) {
      html.push(`<code>${entityText}</code>`)
    } else if (entity instanceof Api.MessageEntityEmail) {
      html.push(entityText)
    } else if (entity instanceof Api.MessageEntityUrl) {
      html.push(entityText)
    } else if (entity instanceof Api.MessageEntityTextUrl) {
      html.push(`<a href="${entity.url}">${entityText}</a>`)
    } else if (entity instanceof Api.MessageEntityMentionName) {
      html.push(entityText)
    } else {
      skipEntity = true
    }
    lastOffset = relativeOffset + (skipEntity ? 0 : length)
  }

  html.push(transform(text.slice(lastOffset, text.length)))
  return html.join('')
}
